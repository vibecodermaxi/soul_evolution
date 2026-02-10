# TODO

## Twitter/X Integration

Post the AI's reflections on each art piece to a dedicated Twitter account, automatically, as part of the daily cron run.

### Setup

1. Create a dedicated X account for the bot
2. Register at [developer.x.com](https://developer.x.com), create a Project + App
3. Set app permissions to **Read and Write**
4. Generate OAuth 1.0a credentials (API Key, API Secret, Access Token, Access Token Secret)
5. Add credentials as env vars on Railway

### Implementation

- Install `twitter-api-v2` package
- Use OAuth 1.0a (static tokens, no refresh needed)
- After each art piece + breadcrumb, post a tweet with the reflection text
- For visual pieces (SVG, HTML), render to PNG via `sharp` or `resvg-js` and attach as media
- Free tier allows 1,500 tweets/month (~180 needed) and ~17 media uploads/day (~6 needed)

### Env Vars

| Variable | Description |
|---|---|
| `TWITTER_API_KEY` | OAuth 1.0a consumer key |
| `TWITTER_API_SECRET` | OAuth 1.0a consumer secret |
| `TWITTER_ACCESS_TOKEN` | Account access token |
| `TWITTER_ACCESS_SECRET` | Account access token secret |

### Notes

- SVGs can't be uploaded directly — must convert to PNG first
- Free tier media upload limit (~17/day) is tight but sufficient for 6 pieces
- If media limits become a problem, consider Late.dev or upgrading to Basic ($200/mo)
- X policy technically requires "prior written approval" for AI bots — low enforcement risk for original art, but worth noting
