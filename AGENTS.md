# Project Agent Guidelines

## Core goals
- Keep the project simple, clean, and performant.
- Prefer clear, minimal UI and straightforward data flow.
- Avoid unnecessary dependencies and features.

## Ownership
- This project is exclusively edited by the agent.

## Direction
- We are moving toward a simple .NET MAUI app using HybridWebView.
- Keep the web layer lightweight and portable so it can be hosted inside HybridWebView.

## Engineering preferences
- Favor plain HTML/CSS/JS over heavy frameworks.
- Keep business logic in small, testable functions.
- Avoid global mutable state when possible; use simple modules or closures.
- Make changes incrementally and prioritize AI readability over human readability.

## Performance
- Minimize DOM thrash; batch updates when possible.
- Avoid large assets or blocking resources.
- Keep rendering smooth on modest hardware.

## Data
- Keep stored data small and structured.
- Use stable schemas and document them in comments if needed.

## Safety
- Do not add network calls unless requested.
- Do not delete user data without explicit confirmation.
