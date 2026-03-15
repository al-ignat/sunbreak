# Realistic Test Prompts

Prompts that mimic real user interactions with AI chat tools (ChatGPT, Claude, Gemini). Each contains naturally embedded sensitive data for testing Sunbreak's detection and masking.

## Detector Coverage

| # | Scenario | Email | Phone | Credit Card | National ID | IP Address | API Key |
|---|----------|:-----:|:-----:|:-----------:|:-----------:|:----------:|:-------:|
| 1 | Resume help | x | x | | | | |
| 2 | Debugging code | | | | | x | x |
| 3 | Tax question | x | | | x | | |
| 4 | Disputing a charge | x | x | x | | | |
| 5 | Server logs | | | | | x | x |
| 6 | Helping a colleague | x | x | | | | |
| 7 | Medical bill | x | x | | x | | |
| 8 | Data cleanup | x | x | x | | | |
| 9 | AWS config | | | | | x | x |
| 10 | Cover letter | x | x | | | | |

---

## 1. Resume help

**Detects:** email, phone

```
Can you improve my resume summary? Here's what I have:

**James Whitfield**
Software Engineer | San Francisco, CA
james.whitfield@gmail.com | (415) 892-3347

Summary: Detail-oriented developer with 6 years of experience building scalable web applications. Proficient in React, Node.js, and AWS. Looking to transition into a senior engineering role at a product-focused company.

I feel like the summary is too generic. Can you make it stand out more?
```

## 2. Debugging code with hardcoded secrets

**Detects:** API key, IP address

````
This script was working yesterday but now it times out. Can you spot what's wrong?

```python
import requests

API_KEY = "sk-proj-8kT2vN4xR9mQ7wL3jF6pY1hB5cA0dE8gU2iK4oS6rW9tX1zM3nJ7qV5"
BASE_URL = "https://api.openai.com/v1/chat/completions"

def ask(prompt):
    resp = requests.post(BASE_URL, headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }, json={
        "model": "gpt-4",
        "messages": [{"role": "user", "content": prompt}]
    }, timeout=30)
    return resp.json()

print(ask("Hello"))
```

I'm running this from my dev server at 192.168.1.105 if that matters.
````

## 3. Tax question

**Detects:** SSN, email

```
I'm filing my taxes and I'm confused about something. My W-2 shows my SSN as 428-73-9162 but when I log into the IRS portal it says there's already a return filed under my number. I haven't filed yet. My accountant Sarah at sarah.moore@hendricks-tax.com hasn't gotten back to me. Is this identity theft? What steps should I take?
```

## 4. Disputing a charge

**Detects:** credit card, phone, email

```
I need help writing a dispute letter to my bank. Here's the situation:

On March 3rd I was charged $847.99 on my Visa ending in 4532-8891-0023-4456 for a purchase I didn't make at some electronics store in Miami. I've never been to Miami. I called the fraud line at (800) 432-1178 but was on hold for 45 minutes and gave up. My email on file is patricia.chen@outlook.com.

Can you draft a formal letter I can send to their disputes department?
```

## 5. Server logs troubleshooting

**Detects:** IP address, API key

````
My nginx is returning 502s intermittently. Here's the relevant log output:

```
2026-03-14 08:12:33 [error] upstream timed out (110: Connection timed out)
  client: 83.221.14.97, server: api.myapp.io, request: "POST /v1/webhooks"
  upstream: "http://10.0.3.42:8080/v1/webhooks"
2026-03-14 08:12:34 [error] upstream timed out (110: Connection timed out)
  client: 203.0.113.55, server: api.myapp.io, request: "POST /v1/process"
  upstream: "http://10.0.3.42:8080/v1/process"
```

The app itself seems fine — I can curl localhost:8080 on the box directly. We also had an issue last week where our Stripe webhook key whsec_5Ka8Gx2rTmN7vQ4wL9jF1pY3hB6cA0dE was rotated — could that be causing retries that are overloading the upstream?
````

## 6. Helping a colleague

**Detects:** email, phone

```
Hey, I need to write a professional but firm Slack message to a coworker who keeps missing deadlines. The context is: I'm a PM and our designer Tom (tom.bergstrom@figma.com) has missed three sprint deadlines in a row. Our team lead Mike asked me to handle it. I don't want to be aggressive but I need to be clear this can't continue. His direct number is +1-628-555-0194 in case I need to call him instead. What should I say?
```

## 7. Medical bill confusion

**Detects:** SSN, phone, email

```
I got a bill from a hospital I've never visited. The bill has my name and SSN (539-48-2710) on it which is terrifying. The billing department number is 1-877-443-2901 and the patient portal says to email billing@stlukes-health.org. Before I contact them — is this a common scam, or did someone actually use my identity at a hospital? What should my first steps be?
```

## 8. Pasting data for cleanup

**Detects:** email, phone, credit card

```
Can you help me turn this into a clean CSV? It's from a form export that came out messy:

Name: Robert Zhang | Email: r.zhang88@yahoo.com | Phone: (312) 709-4421 | Payment: 4916-3385-7726-0149 | Plan: Pro Annual
Name: Lisa Okonkwo | Email: lisa.okonkwo@protonmail.com | Phone: 07911 234567 | Payment: 5241-8830-1127-6653 | Plan: Starter Monthly
Name: David Petrov | Email: d.petrov@company.co.uk | Phone: +44 20 7946 0958 | Payment: 3782-822463-10005 | Plan: Pro Annual
```

## 9. AWS configuration help

**Detects:** API key, IP address

````
I'm trying to set up an S3 bucket policy that only allows access from our office IP. Here's what I've tried:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-company-assets/*",
    "Condition": {
      "IpAddress": {"aws:SourceIp": "74.125.68.100/32"}
    }
  }]
}
```

My AWS access key is AKIAIOSFODNN7EXAMPLE and I'm using the CLI. Is the policy correct? Also should I be whitelisting our VPN exit IP 198.51.100.22 separately?
````

## 10. Cover letter draft

**Detects:** email, phone

```
Write me a cover letter for a product manager role at Stripe. Here's my info:

Name: Maria Santos
Email: maria.santos.pm@gmail.com
Phone: (929) 374-8812
Current role: Senior PM at Shopify (3 years)
Previous: APM at Google (2 years)

I want to emphasize my payments experience and the fact that I grew Shopify's checkout conversion rate by 12%. Keep it under one page and make it sound confident but not arrogant.
```
