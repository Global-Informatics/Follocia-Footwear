using System.Collections.Concurrent;
using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using FollociaMvc.Data;
using FollociaMvc.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FollociaMvc.Controllers;

[ApiController]
[Route("api/commerce")]
public class CommerceApiController(FollociaDbContext db, IConfiguration config, ILogger<CommerceApiController> logger) : ControllerBase
{
    private static readonly ConcurrentDictionary<string, (string Code, DateTime ExpiresAtUtc, int Attempts)> OtpStore = new();

    [HttpPost("auth/send-otp")]
    public async Task<ActionResult<OtpResponseDto>> SendOtp([FromBody] SendOtpRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
        {
            return BadRequest(new OtpResponseDto(false, "Please provide a valid email address.", false, null));
        }

        var cleanEmail = request.Email.Trim().ToLowerInvariant();
        var code = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
        var expiresAt = DateTime.UtcNow.AddMinutes(10);

        OtpStore[cleanEmail] = (code, expiresAt, 0);

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        var sentViaSmtp = false;
        try
        {
            sentViaSmtp = await TrySendSmtpEmailAsync(cleanEmail, code, cts.Token);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "SMTP delivery failed or timed out for {Email}", cleanEmail);
            sentViaSmtp = false;
        }

        if (!sentViaSmtp)
        {
            return StatusCode(500, new OtpResponseDto(
                false,
                $"Unable to deliver OTP verification email to {cleanEmail}. Please check the email address and try again.",
                false,
                null));
        }

        var message = $"A 6-digit verification code has been dispatched to {cleanEmail}. Please check your inbox or spam folder.";

        return Ok(new OtpResponseDto(
            true,
            message,
            true,
            null)); // Never expose OTP on screen or API response - user must check email
    }

    [HttpPost("auth/verify-otp")]
    public ActionResult<OtpResponseDto> VerifyOtp([FromBody] VerifyOtpRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Otp))
        {
            return BadRequest(new OtpResponseDto(false, "Email and OTP are required.", false, null));
        }

        var cleanEmail = request.Email.Trim().ToLowerInvariant();
        var cleanOtp = request.Otp.Trim();

        if (!OtpStore.TryGetValue(cleanEmail, out var entry))
        {
            return BadRequest(new OtpResponseDto(false, "No active OTP request found for this email. Please request a new code.", false, null));
        }

        if (DateTime.UtcNow > entry.ExpiresAtUtc)
        {
            OtpStore.TryRemove(cleanEmail, out _);
            return BadRequest(new OtpResponseDto(false, "OTP has expired. Please request a new code.", false, null));
        }

        if (entry.Attempts >= 5)
        {
            OtpStore.TryRemove(cleanEmail, out _);
            return BadRequest(new OtpResponseDto(false, "Too many failed attempts. Please request a new OTP.", false, null));
        }

        if (entry.Code != cleanOtp)
        {
            OtpStore[cleanEmail] = (entry.Code, entry.ExpiresAtUtc, entry.Attempts + 1);
            return BadRequest(new OtpResponseDto(false, "Invalid OTP code. The code entered does not match the code sent to your email.", false, null));
        }

        // Successfully verified, remove used OTP
        OtpStore.TryRemove(cleanEmail, out _);
        return Ok(new OtpResponseDto(true, "OTP verified successfully.", false, null));
    }

    [HttpGet("reverse-geocode")]
    public async Task<ActionResult> ReverseGeocode([FromQuery] double lat, [FromQuery] double lon)
    {
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180)
        {
            return BadRequest(new { success = false, message = "Invalid coordinates." });
        }

        try
        {
            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.Add("User-Agent", "FolliciaLuxuryFootwear/1.0 (concierge@follicia.com; contact@follicia.in)");
            client.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=1.0");

            var url = FormattableString.Invariant($"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&addressdetails=1&namedetails=1");
            var response = await client.GetAsync(url);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Reverse geocode failed for {Lat}, {Lon}", lat, lon);
        }

        return StatusCode(502, new { success = false, message = "Reverse geocoding service unavailable." });
    }

    private async Task<(string keyId, string keySecret)> GetRazorpayCredentialsAsync()
    {
        // 1. Check database settings (saved via Admin Panel)
        var dbRecord = await db.AdminRecords.FirstOrDefaultAsync(r => r.Id == "gateway_razorpay");
        if (dbRecord != null && !string.IsNullOrWhiteSpace(dbRecord.Meta))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(dbRecord.Meta);
                var kId = doc.RootElement.TryGetProperty("keyId", out var kElem) ? kElem.GetString() ?? "" : "";
                var kSec = doc.RootElement.TryGetProperty("keySecret", out var sElem) ? sElem.GetString() ?? "" : "";
                if (!string.IsNullOrWhiteSpace(kId) && !string.IsNullOrWhiteSpace(kSec))
                {
                    return (kId.Trim(), kSec.Trim());
                }
            }
            catch {}
        }

        // 2. Check appsettings.json
        var razorSection = config.GetSection("Razorpay");
        var cfgKeyId = razorSection["KeyId"] ?? "";
        var cfgKeySecret = razorSection["KeySecret"] ?? "";
        if (!string.IsNullOrWhiteSpace(cfgKeyId) && !string.IsNullOrWhiteSpace(cfgKeySecret))
        {
            return (cfgKeyId.Trim(), cfgKeySecret.Trim());
        }

        // 3. Check environment variables
        var envKeyId = Environment.GetEnvironmentVariable("RAZORPAY_KEY_ID") ?? "";
        var envKeySecret = Environment.GetEnvironmentVariable("RAZORPAY_KEY_SECRET") ?? "";
        if (!string.IsNullOrWhiteSpace(envKeyId) && !string.IsNullOrWhiteSpace(envKeySecret))
        {
            return (envKeyId.Trim(), envKeySecret.Trim());
        }

        return ("", "");
    }

    [HttpGet("razorpay/config")]
    public async Task<ActionResult<RazorpayConfigDto>> GetRazorpayConfig()
    {
        var (keyId, keySecret) = await GetRazorpayCredentialsAsync();
        var isConfigured = !string.IsNullOrWhiteSpace(keyId) && !string.IsNullOrWhiteSpace(keySecret);
        var isTest = keyId.StartsWith("rzp_test_", StringComparison.OrdinalIgnoreCase);
        var mode = isTest ? "test" : (isConfigured ? "live" : "unconfigured");
        var masked = string.IsNullOrWhiteSpace(keySecret) 
            ? "" 
            : (keySecret.Length > 4 ? $"{keySecret[..2]}••••••••{keySecret[^2..]}" : "••••");

        return Ok(new RazorpayConfigDto(true, isConfigured, keyId, mode, masked));
    }

    [HttpPost("razorpay/config")]
    public async Task<ActionResult<object>> SaveRazorpayConfig([FromBody] SaveRazorpayConfigRequest request)
    {
        var cleanKey = (request.KeyId ?? "").Trim();
        var cleanSecret = (request.KeySecret ?? "").Trim();

        var record = await db.AdminRecords.FirstOrDefaultAsync(r => r.Id == "gateway_razorpay");
        if (record == null)
        {
            record = new CommerceAdminRecord
            {
                Id = "gateway_razorpay",
                Module = "payment",
                Title = "Razorpay Gateway Credentials",
                Status = "Active"
            };
            db.AdminRecords.Add(record);
        }

        var payload = new { keyId = cleanKey, keySecret = cleanSecret, updatedAt = DateTime.UtcNow };
        record.Meta = System.Text.Json.JsonSerializer.Serialize(payload);
        record.Status = !string.IsNullOrWhiteSpace(cleanKey) && !string.IsNullOrWhiteSpace(cleanSecret) ? "Configured" : "Pending";
        await db.SaveChangesAsync();

        var isTest = cleanKey.StartsWith("rzp_test_", StringComparison.OrdinalIgnoreCase);
        return Ok(new
        {
            success = true,
            message = "Razorpay credentials updated successfully.",
            isConfigured = !string.IsNullOrWhiteSpace(cleanKey) && !string.IsNullOrWhiteSpace(cleanSecret),
            keyId = cleanKey,
            mode = isTest ? "test" : "live"
        });
    }

    [HttpPost("razorpay/create-order")]
    public async Task<ActionResult<CreateRazorpayOrderResponse>> CreateRazorpayOrder([FromBody] CreateRazorpayOrderRequest request)
    {
        var (keyId, keySecret) = await GetRazorpayCredentialsAsync();

        var amountInPaise = (int)Math.Round(request.Amount * 100);
        var currency = string.IsNullOrWhiteSpace(request.Currency) ? "INR" : request.Currency;
        var receipt = string.IsNullOrWhiteSpace(request.Receipt) ? $"rcpt_{DateTime.UtcNow.Ticks}" : request.Receipt;

        if (string.IsNullOrWhiteSpace(keyId) || string.IsNullOrWhiteSpace(keySecret))
        {
            return BadRequest(new CreateRazorpayOrderResponse(
                false,
                null,
                "",
                amountInPaise,
                currency,
                "Razorpay API credentials are not configured. Please enter your Razorpay Key ID and Secret in Admin Settings or appsettings.json."));
        }

        try
        {
            using var httpClient = new HttpClient();
            var authHeader = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($"{keyId}:{keySecret}"));
            httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authHeader);

            var payload = new
            {
                amount = amountInPaise,
                currency = currency,
                receipt = receipt,
                payment_capture = 1
            };

            var jsonContent = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync("https://api.razorpay.com/v1/orders", jsonContent);

            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                using var doc = System.Text.Json.JsonDocument.Parse(body);
                var orderId = doc.RootElement.GetProperty("id").GetString();
                return Ok(new CreateRazorpayOrderResponse(true, orderId, keyId, amountInPaise, currency, "Razorpay order created successfully."));
            }
            else
            {
                var errBody = await response.Content.ReadAsStringAsync();
                logger.LogWarning("Razorpay API order creation failed: {Error}", errBody);
                string friendlyMessage = "Razorpay order creation failed. Please verify your Razorpay Key ID and Secret.";
                try
                {
                    using var errDoc = System.Text.Json.JsonDocument.Parse(errBody);
                    if (errDoc.RootElement.TryGetProperty("error", out var errObj) &&
                        errObj.TryGetProperty("description", out var descElem))
                    {
                        friendlyMessage = descElem.GetString() ?? friendlyMessage;
                    }
                }
                catch {}
                return BadRequest(new CreateRazorpayOrderResponse(false, null, keyId, amountInPaise, currency, friendlyMessage));
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Razorpay API exception during order creation.");
            return StatusCode(500, new CreateRazorpayOrderResponse(false, null, keyId, amountInPaise, currency, $"Razorpay server error: {ex.Message}"));
        }
    }

    [HttpPost("razorpay/verify-payment")]
    public async Task<ActionResult> VerifyRazorpayPayment([FromBody] VerifyRazorpayPaymentRequest request)
    {
        var (keyId, keySecret) = await GetRazorpayCredentialsAsync();

        if (string.IsNullOrWhiteSpace(request.RazorpayPaymentId))
        {
            return BadRequest(new { success = false, message = "Payment ID is missing." });
        }

        if (string.IsNullOrWhiteSpace(request.RazorpayOrderId) || string.IsNullOrWhiteSpace(request.RazorpaySignature))
        {
            return BadRequest(new { success = false, message = "Order ID or Signature missing from Razorpay callback." });
        }

        if (string.IsNullOrWhiteSpace(keySecret))
        {
            return BadRequest(new { success = false, message = "Razorpay KeySecret is not configured on the server." });
        }

        try
        {
            var text = $"{request.RazorpayOrderId}|{request.RazorpayPaymentId}";
            using var hmac = new HMACSHA256(System.Text.Encoding.UTF8.GetBytes(keySecret));
            var hashBytes = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(text));
            var generatedSignature = Convert.ToHexString(hashBytes).ToLowerInvariant();

            if (generatedSignature.Equals(request.RazorpaySignature.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return Ok(new { success = true, message = "Razorpay payment signature verified successfully." });
            }
            else
            {
                logger.LogWarning("Signature mismatch: generated={Gen}, received={Rec}", generatedSignature, request.RazorpaySignature);
                return BadRequest(new { success = false, message = "Payment signature verification failed. Invalid signature." });
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error verifying Razorpay signature.");
            return StatusCode(500, new { success = false, message = $"Verification error: {ex.Message}" });
        }
    }

    [HttpPost("razorpay/webhook")]
    public async Task<IActionResult> RazorpayWebhook()
    {
        using var reader = new StreamReader(Request.Body);
        var json = await reader.ReadToEndAsync();
        logger.LogInformation("Received Razorpay Webhook event: {Json}", json);
        return Ok(new { received = true });
    }

    private const string AdminNotificationEmail = "info@follicia.in";

    private async Task<bool> SendSmtpNotificationEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        try
        {
            var smtpSection = config.GetSection("Smtp");
            var host = smtpSection["Host"];
            if (string.IsNullOrWhiteSpace(host)) return false;

            var port = int.TryParse(smtpSection["Port"], out var p) ? p : 587;
            var enableSsl = bool.TryParse(smtpSection["EnableSsl"], out var ssl) && ssl;
            var userName = smtpSection["UserName"];
            var password = smtpSection["Password"];
            var senderEmail = smtpSection["SenderEmail"] ?? "concierge@follicia.com";
            var senderName = smtpSection["SenderName"] ?? "Follicia Notifications";

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Timeout = 15000,
            };

            if (!string.IsNullOrWhiteSpace(userName) && !string.IsNullOrWhiteSpace(password))
            {
                client.Credentials = new NetworkCredential(userName, password);
            }

            using var message = new MailMessage
            {
                From = new MailAddress(senderEmail, senderName),
                Subject = subject,
                IsBodyHtml = true,
                Body = htmlBody
            };
            message.To.Add(toEmail);

            await client.SendMailAsync(message, cancellationToken);
            logger.LogInformation("Admin notification email sent via SMTP to {Email} with subject: {Subject}", toEmail, subject);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send notification email via SMTP to {Email}", toEmail);
            return false;
        }
    }

    private async Task<bool> SendContactNotificationEmailAsync(string customerName, string customerEmail, string? phone, string inquirySubject, string messageText, CancellationToken cancellationToken = default)
    {
        var subject = $"🔔 New Customer Inquiry from {customerName} - Follicia Support";
        var safePhone = string.IsNullOrWhiteSpace(phone) ? "Not Provided" : phone;
        var safeTime = DateTime.UtcNow.AddHours(5.5).ToString("dd MMM yyyy, hh:mm tt"); // IST

        var html = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e6ded7; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);"">
    <div style=""background: #171310; padding: 24px 20px; text-align: center; border-bottom: 3px solid #d9b36e;"">
        <h1 style=""color: #d9b36e; font-size: 22px; font-weight: 300; letter-spacing: 4px; margin: 0;"">FOLLICIA</h1>
        <p style=""color: #e5cfb2; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin: 5px 0 0;"">Luxury Footwear Atelier • Support Notification</p>
    </div>
    <div style=""padding: 28px 24px; color: #171310;"">
        <div style=""background: #fff8eb; border: 1px solid #f0dcb5; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; font-size: 13px; color: #845318; font-weight: 600;"">
            ✉️ New message received on the Contact Us page
        </div>
        <h2 style=""font-size: 17px; font-weight: 700; margin: 0 0 16px; color: #24130d;"">Inquiry Details</h2>
        <table style=""width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 22px;"">
            <tr style=""border-bottom: 1px solid #f0ebe4;"">
                <td style=""padding: 8px 0; color: #786b63; width: 140px; font-weight: 600;"">Customer Name:</td>
                <td style=""padding: 8px 0; color: #171310; font-weight: 700;"">{customerName}</td>
            </tr>
            <tr style=""border-bottom: 1px solid #f0ebe4;"">
                <td style=""padding: 8px 0; color: #786b63; font-weight: 600;"">Customer Email:</td>
                <td style=""padding: 8px 0;""><a href=""mailto:{customerEmail}"" style=""color: #a87648; text-decoration: underline;"">{customerEmail}</a></td>
            </tr>
            <tr style=""border-bottom: 1px solid #f0ebe4;"">
                <td style=""padding: 8px 0; color: #786b63; font-weight: 600;"">Phone Number:</td>
                <td style=""padding: 8px 0; color: #171310;"">{safePhone}</td>
            </tr>
            <tr style=""border-bottom: 1px solid #f0ebe4;"">
                <td style=""padding: 8px 0; color: #786b63; font-weight: 600;"">Inquiry Subject:</td>
                <td style=""padding: 8px 0; color: #171310; font-weight: 600;"">{inquirySubject}</td>
            </tr>
            <tr>
                <td style=""padding: 8px 0; color: #786b63; font-weight: 600;"">Received At (IST):</td>
                <td style=""padding: 8px 0; color: #171310;"">{safeTime}</td>
            </tr>
        </table>

        <div style=""background: #faf8f5; border-left: 4px solid #d9b36e; border-radius: 4px; padding: 16px; margin-bottom: 24px;"">
            <span style=""font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #a87648; font-weight: 700; display: block; margin-bottom: 6px;"">Customer Message:</span>
            <p style=""font-size: 13px; line-height: 1.6; color: #24130d; margin: 0; white-space: pre-wrap;"">{messageText}</p>
        </div>

        <div style=""text-align: center; margin-top: 25px;"">
            <a href=""https://follicia.in/#/admin/contact"" style=""display: inline-block; background: #24130d; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;"">
                Open Admin Support Desk
            </a>
        </div>
    </div>
    <div style=""background: #fbf9f6; padding: 12px 20px; text-align: center; border-top: 1px solid #eee; font-size: 11px; color: #999;"">
        Automated alert dispatched to <strong>{AdminNotificationEmail}</strong> • Follicia Concierge Engine
    </div>
</div>";

        return await SendSmtpNotificationEmailAsync(AdminNotificationEmail, subject, html, cancellationToken);
    }

    private async Task<bool> SendOrderNotificationEmailAsync(CommerceOrder order, CancellationToken cancellationToken = default)
    {
        var subject = $"🛍️ New Order Received: {order.Id} by {order.Customer} - Follicia";
        var safeTime = DateTime.UtcNow.AddHours(5.5).ToString("dd MMM yyyy, hh:mm tt"); // IST

        var html = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e6ded7; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);"">
    <div style=""background: #171310; padding: 24px 20px; text-align: center; border-bottom: 3px solid #d9b36e;"">
        <h1 style=""color: #d9b36e; font-size: 22px; font-weight: 300; letter-spacing: 4px; margin: 0;"">FOLLICIA</h1>
        <p style=""color: #e5cfb2; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin: 5px 0 0;"">Luxury Footwear Atelier • New Order Alert</p>
    </div>
    <div style=""padding: 28px 24px; color: #171310;"">
        <div style=""background: #edfbf2; border: 1px solid #c2f0d4; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; font-size: 13px; color: #186a3b; font-weight: 600;"">
            🎉 A new client order has been placed successfully!
        </div>
        <h2 style=""font-size: 17px; font-weight: 700; margin: 0 0 16px; color: #24130d;"">Order Summary</h2>
        <table style=""width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 22px;"">
            <tr style=""border-bottom: 1px solid #f0ebe4;"">
                <td style=""padding: 8px 0; color: #786b63; width: 140px; font-weight: 600;"">Order ID:</td>
                <td style=""padding: 8px 0; color: #171310; font-weight: 700; font-family: monospace;"">{order.Id}</td>
            </tr>
            <tr style=""border-bottom: 1px solid #f0ebe4;"">
                <td style=""padding: 8px 0; color: #786b63; font-weight: 600;"">Customer Name:</td>
                <td style=""padding: 8px 0; color: #171310; font-weight: 700;"">{order.Customer}</td>
            </tr>
            <tr style=""border-bottom: 1px solid #f0ebe4;"">
                <td style=""padding: 8px 0; color: #786b63; font-weight: 600;"">Customer Email:</td>
                <td style=""padding: 8px 0;""><a href=""mailto:{order.Email}"" style=""color: #a87648; text-decoration: underline;"">{order.Email}</a></td>
            </tr>
            <tr style=""border-bottom: 1px solid #f0ebe4;"">
                <td style=""padding: 8px 0; color: #786b63; font-weight: 600;"">Product & Size:</td>
                <td style=""padding: 8px 0; color: #171310; font-weight: 600;"">{order.Product} (Size {order.Size})</td>
            </tr>
            <tr style=""border-bottom: 1px solid #f0ebe4;"">
                <td style=""padding: 8px 0; color: #786b63; font-weight: 600;"">Total Amount:</td>
                <td style=""padding: 8px 0; color: #24130d; font-weight: 800; font-size: 15px;"">Rs. {order.Amount:N0}</td>
            </tr>
            <tr style=""border-bottom: 1px solid #f0ebe4;"">
                <td style=""padding: 8px 0; color: #786b63; font-weight: 600;"">Payment Method:</td>
                <td style=""padding: 8px 0; color: #171310;"">{order.PaymentMethod} ({order.PaymentStatus})</td>
            </tr>
            <tr style=""border-bottom: 1px solid #f0ebe4;"">
                <td style=""padding: 8px 0; color: #786b63; font-weight: 600;"">Delivery Address:</td>
                <td style=""padding: 8px 0; color: #171310;"">{order.DeliveryAddress}</td>
            </tr>
            <tr>
                <td style=""padding: 8px 0; color: #786b63; font-weight: 600;"">Date & Time (IST):</td>
                <td style=""padding: 8px 0; color: #171310;"">{safeTime}</td>
            </tr>
        </table>

        <div style=""text-align: center; margin-top: 25px;"">
            <a href=""https://follicia.in/#/admin/orders"" style=""display: inline-block; background: #24130d; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;"">
                Manage Orders in Admin Panel
            </a>
        </div>
    </div>
    <div style=""background: #fbf9f6; padding: 12px 20px; text-align: center; border-top: 1px solid #eee; font-size: 11px; color: #999;"">
        Automated alert dispatched to <strong>{AdminNotificationEmail}</strong> • Follicia Order Operations
    </div>
</div>";

        return await SendSmtpNotificationEmailAsync(AdminNotificationEmail, subject, html, cancellationToken);
    }

    [HttpPost("notify-contact")]
    public async Task<ActionResult<NotificationResultDto>> NotifyContact(ContactNotificationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new NotificationResultDto(false, "Name and email are required.", false));
        }

        var sent = await SendContactNotificationEmailAsync(
            request.Name,
            request.Email,
            request.Phone,
            request.Subject ?? "Customer Inquiry",
            request.Message ?? "");

        return Ok(new NotificationResultDto(true, "Notification processed.", sent));
    }

    [HttpPost("notify-order")]
    public async Task<ActionResult<NotificationResultDto>> NotifyOrder(OrderNotificationRequest request)
    {
        var tempOrder = new CommerceOrder
        {
            Id = request.OrderId,
            Customer = request.Customer,
            Email = request.Email,
            Product = request.Product,
            Size = request.Size,
            Amount = ParseMoney(request.Amount),
            PaymentMethod = request.PaymentMethod ?? "Online",
            PaymentStatus = "Confirmed",
            DeliveryAddress = request.DeliveryAddress ?? "On file",
            Date = "Today"
        };

        var sent = await SendOrderNotificationEmailAsync(tempOrder);
        return Ok(new NotificationResultDto(true, "Order notification processed.", sent));
    }

    private async Task<bool> TrySendSmtpEmailAsync(string toEmail, string code, CancellationToken cancellationToken = default)
    {
        try
        {
            var smtpSection = config.GetSection("Smtp");
            var host = smtpSection["Host"];
            if (string.IsNullOrWhiteSpace(host)) return false;

            var port = int.TryParse(smtpSection["Port"], out var p) ? p : 587;
            var enableSsl = bool.TryParse(smtpSection["EnableSsl"], out var ssl) && ssl;
            var userName = smtpSection["UserName"];
            var password = smtpSection["Password"];
            var senderEmail = smtpSection["SenderEmail"] ?? "concierge@follicia.com";
            var senderName = smtpSection["SenderName"] ?? "Follicia";

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Timeout = 15000, // 15 seconds max
            };

            if (!string.IsNullOrWhiteSpace(userName) && !string.IsNullOrWhiteSpace(password))
            {
                client.Credentials = new NetworkCredential(userName, password);
            }

            using var message = new MailMessage
            {
                From = new MailAddress(senderEmail, senderName),
                Subject = $"{code} is your Follicia Verification Code",
                IsBodyHtml = true,
                Body = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e6ded7; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);"">
    <div style=""background: #351c13; padding: 26px 20px; text-align: center; border-bottom: 3px solid #d9b36e;"">
        <h1 style=""color: #d9b36e; font-size: 24px; font-weight: 300; letter-spacing: 4px; margin: 0;"">FOLLICIA</h1>
        <p style=""color: #e5cfb2; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 6px 0 0;"">Every Step, A Statement.</p>
    </div>
    <div style=""padding: 30px 24px; color: #351c13;"">
        <h2 style=""font-size: 18px; font-weight: 600; margin: 0 0 10px;"">Client Authentication Code</h2>
        <p style=""font-size: 13px; line-height: 1.6; color: #555; margin: 0 0 20px;"">
            You requested a one-time verification code to securely access your Follicia account. Please enter the code below to proceed:
        </p>
        <div style=""background: #fcf9f6; border: 1.5px dashed #d9b36e; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 22px;"">
            <span style=""font-size: 34px; font-family: monospace; font-weight: 700; letter-spacing: 8px; color: #a87648; display: inline-block;"">{code}</span>
        </div>
        <p style=""font-size: 12px; color: #888; line-height: 1.5; margin: 0;"">
            • Code is valid for <strong>10 minutes</strong>.<br />
            • If you did not request this code, please ignore this email.
        </p>
    </div>
    <div style=""background: #f9f9f9; padding: 14px 20px; text-align: center; border-top: 1px solid #eee; font-size: 11px; color: #999;"">
        © 2026 Follicia Ltd. All rights reserved.
    </div>
</div>"
            };
            message.To.Add(toEmail);

            await client.SendMailAsync(message, cancellationToken);
            logger.LogInformation("Verification OTP sent via SMTP to {Email}", toEmail);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send OTP via SMTP to {Email}", toEmail);
            return false;
        }
    }

    [HttpGet("bootstrap")]
    public async Task<ActionResult<BootstrapDto>> Bootstrap()
    {
        if (!AppDatabaseStatus.IsAvailable)
        {
            return DemoBootstrap();
        }

        try
        {
            var products = await db.Products.AsNoTracking().OrderBy(product => product.Id).ToListAsync();
            var orders = await db.Orders.AsNoTracking().OrderByDescending(order => order.CreatedAtUtc).ToListAsync();
            var customers = await db.Customers.AsNoTracking()
                .Include(customer => customer.Addresses)
                .Include(customer => customer.Wishlist)
                .Include(customer => customer.Subscriptions)
                .OrderBy(customer => customer.Name)
                .ToListAsync();

            return new BootstrapDto(
                products.Select(ToProduct).ToList(),
                orders.Select(ToOrder).ToList(),
                customers.Select(ToCustomer).ToList());
        }
        catch
        {
            return DemoBootstrap();
        }
    }

    [HttpPost("customers/ensure")]
    public async Task<ActionResult<CustomerDto>> EnsureCustomer(EnsureCustomerRequest request)
    {
        var cleanEmail = (request.Email ?? "").Trim().ToLower();
        var customer = await db.Customers
            .Include(item => item.Addresses)
            .Include(item => item.Wishlist)
            .Include(item => item.Subscriptions)
            .FirstOrDefaultAsync(item => item.Id == request.Id || (!string.IsNullOrEmpty(cleanEmail) && item.Email.ToLower() == cleanEmail));

        if (customer is null)
        {
            var nameParts = request.Name.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            customer = new CommerceCustomer
            {
                Id = request.Id,
                Name = request.Name,
                Email = request.Email,
                FirstName = nameParts.ElementAtOrDefault(0) ?? request.Name,
                LastName = nameParts.ElementAtOrDefault(1) ?? "",
                Tier = request.Tier,
                MemberSince = "MMXXVI"
            };
            db.Customers.Add(customer);
            try
            {
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Concurrency when ensuring customer {Email}. Re-fetching.", request.Email);
                customer = await db.Customers
                    .Include(item => item.Addresses)
                    .Include(item => item.Wishlist)
                    .Include(item => item.Subscriptions)
                    .FirstOrDefaultAsync(item => item.Id == request.Id || (!string.IsNullOrEmpty(cleanEmail) && item.Email.ToLower() == cleanEmail));
            }
        }

        return customer is not null ? ToCustomer(customer) : NotFound();
    }

    [HttpPut("customers/{id}")]
    public async Task<IActionResult> SaveCustomer(string id, CustomerDto dto)
    {
        var cleanEmail = (dto.Email ?? "").Trim().ToLower();
        var customer = await db.Customers
            .Include(item => item.Addresses)
            .Include(item => item.Wishlist)
            .Include(item => item.Subscriptions)
            .FirstOrDefaultAsync(item => item.Id == id || (!string.IsNullOrEmpty(cleanEmail) && item.Email.ToLower() == cleanEmail));

        if (customer is null)
        {
            customer = new CommerceCustomer { Id = id };
            db.Customers.Add(customer);
        }

        customer.Name = dto.Name;
        customer.Email = dto.Email;
        customer.FirstName = dto.FirstName;
        customer.LastName = dto.LastName;
        customer.Phone = dto.Phone;
        customer.Tier = dto.Tier;
        customer.MemberSince = dto.MemberSince;

        // 1. Reconcile Addresses safely
        var incomingAddrIds = (dto.Addresses ?? []).Select(a => a.Id).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var addressesToRemove = customer.Addresses.Where(a => !incomingAddrIds.Contains(a.Id)).ToList();
        foreach (var addr in addressesToRemove)
        {
            customer.Addresses.Remove(addr);
            db.Addresses.Remove(addr);
        }

        foreach (var addrDto in dto.Addresses ?? [])
        {
            var existingAddr = customer.Addresses.FirstOrDefault(a => string.Equals(a.Id, addrDto.Id, StringComparison.OrdinalIgnoreCase));
            if (existingAddr is not null)
            {
                existingAddr.FirstName = addrDto.FirstName;
                existingAddr.LastName = addrDto.LastName;
                existingAddr.Company = addrDto.Company;
                existingAddr.Address = addrDto.Address;
                existingAddr.Address2 = addrDto.Address2;
                existingAddr.City = addrDto.City;
                existingAddr.Country = addrDto.Country;
                existingAddr.Region = addrDto.Region;
                existingAddr.Zip = addrDto.Zip;
                existingAddr.Phone = addrDto.Phone;
                existingAddr.IsDefault = addrDto.IsDefault;
            }
            else
            {
                var newAddr = new CommerceAddress
                {
                    Id = string.IsNullOrWhiteSpace(addrDto.Id) ? $"addr-{Guid.NewGuid():N}" : addrDto.Id,
                    CustomerId = customer.Id,
                    FirstName = addrDto.FirstName,
                    LastName = addrDto.LastName,
                    Company = addrDto.Company,
                    Address = addrDto.Address,
                    Address2 = addrDto.Address2,
                    City = addrDto.City,
                    Country = addrDto.Country,
                    Region = addrDto.Region,
                    Zip = addrDto.Zip,
                    Phone = addrDto.Phone,
                    IsDefault = addrDto.IsDefault
                };
                customer.Addresses.Add(newAddr);
                db.Addresses.Add(newAddr);
            }
        }

        // 2. Reconcile Wishlist safely by querying database records directly to avoid duplicate keys
        var dbWishlist = await db.WishlistItems.Where(w => w.CustomerId == customer.Id).ToListAsync();
        var incomingProductIds = (dto.Wishlist ?? [])
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Select(p => p.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var wishlistToRemove = dbWishlist.Where(w => !incomingProductIds.Contains(w.ProductId.Trim())).ToList();
        if (wishlistToRemove.Count > 0)
        {
            db.WishlistItems.RemoveRange(wishlistToRemove);
            foreach (var w in wishlistToRemove)
            {
                customer.Wishlist.Remove(w);
            }
        }

        var existingWishlistInDb = dbWishlist
            .Where(w => !wishlistToRemove.Contains(w))
            .Select(w => w.ProductId.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var pId in incomingProductIds)
        {
            if (!existingWishlistInDb.Contains(pId))
            {
                var newWish = new CommerceWishlistItem { CustomerId = customer.Id, ProductId = pId };
                db.WishlistItems.Add(newWish);
                customer.Wishlist.Add(newWish);
                existingWishlistInDb.Add(pId);
            }
        }

        // 3. Reconcile Subscriptions safely by querying database records directly
        var dbSubs = await db.Subscriptions.Where(s => s.CustomerId == customer.Id).ToListAsync();
        var incomingSubs = (dto.Subscriptions ?? [])
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var subsToRemove = dbSubs.Where(s => !incomingSubs.Contains(s.Title.Trim())).ToList();
        if (subsToRemove.Count > 0)
        {
            db.Subscriptions.RemoveRange(subsToRemove);
            foreach (var s in subsToRemove)
            {
                customer.Subscriptions.Remove(s);
            }
        }

        var existingSubsInDb = dbSubs
            .Where(s => !subsToRemove.Contains(s))
            .Select(s => s.Title.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var subTitle in incomingSubs)
        {
            if (!existingSubsInDb.Contains(subTitle))
            {
                var newSub = new CommerceSubscription { CustomerId = customer.Id, Title = subTitle };
                db.Subscriptions.Add(newSub);
                customer.Subscriptions.Add(newSub);
                existingSubsInDb.Add(subTitle);
            }
        }

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException ex)
        {
            logger.LogWarning(ex, "DbUpdateConcurrencyException in SaveCustomer for {Id}. Optimistic lock conflict ignored.", id);
        }
        catch (DbUpdateException ex)
        {
            logger.LogWarning(ex, "DbUpdateException safely handled in SaveCustomer for {Id}. Duplicate key or concurrent update suppressed.", id);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Exception in SaveCustomer for {Id}.", id);
        }

        return NoContent();
    }

    [HttpDelete("customers/{id}")]
    public async Task<IActionResult> DeleteCustomer(string id)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer is null) return NotFound();

        db.Customers.Remove(customer);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("products/{id}")]
    public async Task<IActionResult> SaveProduct(string id, ProductDto dto)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null)
        {
            product = new CommerceProduct { Id = id };
            db.Products.Add(product);
        }

        product.Title = dto.Title;
        product.Edition = dto.Edition;
        product.PriceAmount = ParseMoney(dto.Price);
        product.CurrencyCode = ParseCurrency(dto.Price);
        product.Tone = dto.Tone;
        product.ImagePath = SerializeImages(dto.Images, dto.Image);
        product.Status = dto.Status;
        product.Produced = dto.Produced;
        product.Reserved = dto.Reserved;
        product.Available = dto.Available;
        product.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("products/{id}")]
    public async Task<IActionResult> DeleteProduct(string id)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();

        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("product-images")]
    [RequestSizeLimit(25_000_000)]
    public async Task<ActionResult<object>> UploadProductImages([FromForm] List<IFormFile> files)
    {
        if (files.Count == 0) return BadRequest();

        var uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "products");
        Directory.CreateDirectory(uploadsRoot);

        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        var urls = new List<string>();
        foreach (var file in files.Take(5))
        {
            if (file.Length == 0 || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)) continue;

            var extension = Path.GetExtension(file.FileName);
            if (!allowed.Contains(extension)) continue;

            var fileName = Guid.NewGuid().ToString("N")[..12] + extension.ToLowerInvariant();
            var path = Path.Combine(uploadsRoot, fileName);
            await using var stream = System.IO.File.Create(path);
            await file.CopyToAsync(stream);
            urls.Add($"/uploads/products/{fileName}");
        }

        return new { images = urls };
    }

    [HttpPut("orders/{id}")]
    public async Task<IActionResult> SaveOrder(string id, OrderDto dto)
    {
        var order = await db.Orders.FindAsync(id);
        if (order is null) return NotFound();

        order.Status = dto.Status;
        order.PaymentStatus = dto.PaymentStatus;
        order.DeliveryStatus = dto.DeliveryStatus;
        order.DeliveryEta = dto.DeliveryEta;
        order.TrackingCode = dto.TrackingCode;
        order.PaymentMethod = dto.PaymentMethod;
        order.DeliveryAddress = dto.DeliveryAddress;
        order.Date = dto.Date;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("orders")]
    public async Task<ActionResult<IReadOnlyList<OrderDto>>> CreateOrders(IReadOnlyList<CreateOrderRequest> requests)
    {
        var created = new List<CommerceOrder>();
        foreach (var request in requests)
        {
            var order = new CommerceOrder
            {
                Id = $"RSV-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() % 1000000}-{created.Count + 1}",
                CustomerId = request.CustomerId,
                Customer = request.Customer,
                Email = request.Email,
                Product = request.Product,
                Size = request.Size,
                Amount = ParseMoney(request.Amount) * Math.Max(request.Quantity, 1),
                CurrencyCode = ParseCurrency(request.Amount),
                Status = "Concierge Review",
                PaymentStatus = request.PaymentMethod.Contains("Cash on Delivery") ? "Due on Delivery" : "Payment Captured",
                DeliveryStatus = "Order Placed",
                DeliveryEta = "Concierge will confirm within 24h",
                TrackingCode = "",
                PaymentMethod = request.PaymentMethod,
                DeliveryAddress = request.DeliveryAddress,
                Date = "Today"
            };
            created.Add(order);
            db.Orders.Add(order);

            var product = await db.Products.FindAsync(request.ProductId);
            if (product is not null)
            {
                product.Reserved += Math.Max(request.Quantity, 1);
                product.Available = Math.Max(product.Available - Math.Max(request.Quantity, 1), 0);
                product.UpdatedAtUtc = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync();

        foreach (var order in created)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await SendOrderNotificationEmailAsync(order);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Background email notification failed for order {OrderId}", order.Id);
                }
            });
        }

        return created.Select(ToOrder).ToList();
    }

    [HttpGet("admin-records")]
    public async Task<ActionResult<IReadOnlyList<AdminRecordDto>>> AdminRecords()
    {
        var records = await db.AdminRecords.AsNoTracking()
            .OrderBy(record => record.Module)
            .ThenByDescending(record => record.CreatedAtUtc)
            .ToListAsync();
        return records.Select(ToAdminRecord).ToList();
    }

    [HttpPut("admin-records/{module}")]
    public async Task<IActionResult> SaveAdminRecords(string module, IReadOnlyList<AdminRecordDto> records)
    {
        var existing = await db.AdminRecords.Where(record => record.Module == module).ToListAsync();
        var incomingIds = (records ?? []).Where(r => !string.IsNullOrWhiteSpace(r.Id)).Select(r => r.Id).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var toRemove = existing.Where(r => !incomingIds.Contains(r.Id)).ToList();
        if (toRemove.Count > 0)
        {
            db.AdminRecords.RemoveRange(toRemove);
        }

        foreach (var record in records ?? [])
        {
            var match = existing.FirstOrDefault(r => string.Equals(r.Id, record.Id, StringComparison.OrdinalIgnoreCase));
            if (match is not null)
            {
                match.Title = record.Title;
                match.Meta = record.Meta;
                match.Status = record.Status;
            }
            else
            {
                var newRec = new CommerceAdminRecord
                {
                    Id = string.IsNullOrWhiteSpace(record.Id) ? $"{module}-{Guid.NewGuid():N}" : record.Id,
                    Module = module,
                    Title = record.Title,
                    Meta = record.Meta,
                    Status = record.Status,
                    CreatedAtUtc = DateTime.UtcNow
                };
                db.AdminRecords.Add(newRec);
            }
        }

        try
        {
            await db.SaveChangesAsync();

            if (string.Equals(module, "contact", StringComparison.OrdinalIgnoreCase) || string.Equals(module, "tickets", StringComparison.OrdinalIgnoreCase))
            {
                var newRecords = (records ?? []).Where(r => !existing.Any(e => string.Equals(e.Id, r.Id, StringComparison.OrdinalIgnoreCase))).ToList();
                foreach (var newRec in newRecords)
                {
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            var name = "Guest Client";
                            var email = "client@follicia.com";
                            var phone = "";
                            var subject = newRec.Title ?? "Inquiry";
                            var message = newRec.Meta ?? "";

                            if (newRec.Meta != null && newRec.Meta.Trim().StartsWith("{"))
                            {
                                try
                                {
                                    using var doc = System.Text.Json.JsonDocument.Parse(newRec.Meta);
                                    var root = doc.RootElement;
                                    if (root.TryGetProperty("name", out var n)) name = n.GetString() ?? name;
                                    if (root.TryGetProperty("email", out var em)) email = em.GetString() ?? email;
                                    if (root.TryGetProperty("phone", out var p)) phone = p.GetString() ?? phone;
                                    if (root.TryGetProperty("subject", out var s)) subject = s.GetString() ?? subject;
                                    if (root.TryGetProperty("message", out var m)) message = m.GetString() ?? message;
                                }
                                catch { }
                            }
                            else if (newRec.Title != null && newRec.Title.Contains(" from "))
                            {
                                var parts = newRec.Title.Split(" from ");
                                subject = parts[0].Trim();
                                name = parts[1].Trim();
                            }

                            await SendContactNotificationEmailAsync(name, email, phone, subject, message);
                        }
                        catch (Exception ex)
                        {
                            logger.LogWarning(ex, "Background contact email notification failed for {RecordId}", newRec.Id);
                        }
                    });
                }
            }
        }
        catch (DbUpdateConcurrencyException ex)
        {
            logger.LogWarning(ex, "DbUpdateConcurrencyException in SaveAdminRecords for module {Module}.", module);
        }

        return NoContent();
    }

    private static ProductDto ToProduct(CommerceProduct product)
    {
        var images = DeserializeImages(product.ImagePath);
        var prefix = (product.CurrencyCode == "INR" || string.IsNullOrWhiteSpace(product.CurrencyCode) || product.CurrencyCode == "EUR") ? "Rs." : product.CurrencyCode;
        var formattedPrice = $"{prefix} {product.PriceAmount:N0}";
        return new(product.Id, product.Title, product.Edition, formattedPrice, product.Tone, images.FirstOrDefault() ?? product.ImagePath, images, product.Status, product.Produced, product.Reserved, product.Available);
    }

    private static OrderDto ToOrder(CommerceOrder order) =>
        new(
            order.Id,
            order.CustomerId,
            order.Customer,
            order.Email,
            order.Product,
            order.Size,
            $"{(order.CurrencyCode == "INR" || string.IsNullOrWhiteSpace(order.CurrencyCode) || order.CurrencyCode == "EUR" ? "Rs." : order.CurrencyCode)} {order.Amount:N0}",
            order.Status,
            order.PaymentStatus,
            order.DeliveryStatus,
            order.DeliveryEta,
            order.TrackingCode,
            order.PaymentMethod,
            order.DeliveryAddress,
            order.Date);

    private static CustomerDto ToCustomer(CommerceCustomer customer) =>
        new(
            customer.Id,
            customer.Name,
            customer.Email,
            customer.FirstName,
            customer.LastName,
            customer.Phone,
            customer.Tier,
            customer.MemberSince,
            customer.Addresses.Select(address => new AddressDto(address.Id, address.FirstName, address.LastName, address.Company, address.Address, address.Address2, address.City, address.Country, address.Region, address.Zip, address.Phone, address.IsDefault)).ToList(),
            customer.Wishlist.Select(item => item.ProductId).ToList(),
            customer.Subscriptions.Select(item => item.Title).ToList());

    private static AdminRecordDto ToAdminRecord(CommerceAdminRecord record) =>
        new(record.Id, record.Module, record.Title, record.Meta, record.Status);

    private static BootstrapDto DemoBootstrap() =>
        new([], [], []);

    private static decimal ParseMoney(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return 0;
        var clean = value.Trim();
        var chars = clean.ToCharArray();
        int firstDigitIndex = -1;
        for (int i = 0; i < chars.Length; i++)
        {
            if (char.IsDigit(chars[i]))
            {
                firstDigitIndex = i;
                break;
            }
        }
        if (firstDigitIndex == -1) return 0;
        var numericPart = new string(chars.Skip(firstDigitIndex).Where(c => char.IsDigit(c) || c == '.').ToArray());
        return decimal.TryParse(numericPart, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var amount) ? amount : 0;
    }

    private static string ParseCurrency(string value)
    {
        var clean = (value ?? "").Trim();
        if (clean.StartsWith("EUR", StringComparison.OrdinalIgnoreCase) || clean.StartsWith("€")) return "EUR";
        if (clean.StartsWith("USD", StringComparison.OrdinalIgnoreCase) || clean.StartsWith("$")) return "USD";
        return "INR";
    }
    private static List<string> DeserializeImages(string value) =>
        value.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Take(5).ToList();

    private static string SerializeImages(IReadOnlyList<string>? images, string fallback)
    {
        var gallery = (images is { Count: > 0 } ? images : new[] { fallback })
            .Where(image => !string.IsNullOrWhiteSpace(image))
            .Distinct()
            .Take(5);
        return string.Join('|', gallery);
    }
}
