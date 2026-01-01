---
description: Thai timezone handling for this user (UTC+7)
---

# User Timezone: Thailand (UTC+7)

## Important Notes

1. **User Location**: Thailand (Asia/Bangkok timezone, UTC+7)

2. **When generating ISO datetime strings**, ALWAYS include timezone offset:
   - ✅ Correct: `2026-01-01T20:30:00+07:00`
   - ❌ Wrong: `2026-01-01T20:30:00` (interpreted as UTC!)

3. **Common Bug to Avoid**:
   - Without timezone offset, 8:30 PM becomes 3:30 AM (5-hour shift to UTC)
   - Always calculate offset: `+07:00` for Thailand

4. **In Agent Prompts (gemini.js)**:
   - Include `timezoneString` variable with user's offset
   - Add TIMEZONE RULE section for AI to follow
   - Example format: `"${todayDate}T[HH:MM:00]+07:00"`

## Code Pattern for Timezone
```javascript
// Get timezone offset
const timezoneOffset = -new Date().getTimezoneOffset();
const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60).toString().padStart(2, '0');
const offsetMins = (Math.abs(timezoneOffset) % 60).toString().padStart(2, '0');
const timezoneString = `${timezoneOffset >= 0 ? '+' : '-'}${offsetHours}:${offsetMins}`;
// Result for Thailand: "+07:00"
```
