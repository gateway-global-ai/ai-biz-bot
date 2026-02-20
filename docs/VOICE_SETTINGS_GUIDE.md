# Voice AI Settings Panel - User Guide

## Overview

The Voice AI Settings panel provides complete control and visibility into your Clear Voice Technology. Access it by clicking the **⚙️ Settings** cog icon in the ConciergePanel header.

---

## Interface Layout

### Engine Selector
At the top, choose which voice engine to configure:
- **Clear Voice Stream** - Real-time streaming (Premium tier)
- **Clear Voice PTT** - Push-to-Talk transactional mode (Standard tier)

### Three Tabs

#### 1️⃣ Settings Tab
**Buffer Delay** (Response Speed)
- **Quick Presets**:
  - `250ms` - Aggressive (High risk of cutoffs)
  - `500ms` - Optimal (Recommended)
  - `1000ms` - Balanced (Safe)
  - `2000ms` - Conservative (Very safe, slower)
  
- **Fine-tune Slider**: Adjust from 100ms-2000ms in 50ms increments

**Silence Detection Threshold**
- Range: -60dB to -30dB
- Lower = More sensitive (may trigger on background noise)
- Higher = Less sensitive

**Audio Analysis** (PTT Mode Only)
- ☑️ Emotion Detection
- ☑️ Sentiment Analysis
- ☑️ DISC Profiling

**Actions**:
- `Apply Settings` - Save changes and restart voice engine
- `Reset to Defaults` - Restore recommended values

#### 2️⃣ Performance Tab
**Live Metrics Cards**:
- 📊 Average Response Time
- ⚡ Current Buffer Delay
- 📈 Cutoff Rate (%)

**Real-time Monitoring**:
Toggle ON to capture metrics during voice sessions

**Session History Table**:
- Timestamp
- Buffer delay used
- Response time
- Status (Clean/Cutoff)

#### 3️⃣ System Logs Tab
**Event Log Console**:
- Real-time system events
- Configuration changes
- Error messages

**Export**:
- `Export JSON` - Download all logs and performance data

---

## A/B Testing Workflow

### Step 1: Baseline Test (500ms)
1. Open Settings → **Settings** tab
2. Click `500ms - Optimal` preset
3. Click `Apply Settings`
4. Switch to **Performance** tab
5. Enable `Real-time Monitoring`
6. Test with 9 phrases (see BUFFER_AB_TEST_RESULTS.md)

### Step 2: Aggressive Test (250ms)
1. Return to **Settings** tab
2. Click `250ms - Aggressive` preset
3. Click `Apply Settings`
4. Test same 9 phrases
5. Compare cutoff rates

### Step 3: Evaluate Results
Go to **Performance** tab:
- If **Cutoff Rate < 5%**: Keep aggressive setting
- If **Cutoff Rate 5-15%**: Bump to 350ms and retest
- If **Cutoff Rate > 15%**: Revert to 500ms

### Step 4: Export Data
1. Switch to **System Logs** tab
2. Click `Export JSON`
3. Share with team or keep for records

---

## Configuration Examples

### Fast-Talking Professional (Recommended)
```
Buffer Delay: 250ms
Silence Threshold: -42dB
Analysis: Emotion ON, Sentiment ON, DISC ON
```

### Noisy Environment (Coffee Shop)
```
Buffer Delay: 500ms
Silence Threshold: -38dB
Analysis: All OFF (reduce processing)
```

### Slow-Speaking Senior Care
```
Buffer Delay: 1500ms
Silence Threshold: -48dB
Analysis: Emotion ON (empathy detection)
```

### Demo / Marketing (Speed Priority)
```
Buffer Delay: 250ms
Silence Threshold: -40dB
Analysis: All OFF (max speed)
```

---

## Troubleshooting

### Problem: Words Getting Cut Off
**Solution**:
1. Open Settings → Settings tab
2. Increase Buffer Delay by 100-250ms
3. Apply and retest

### Problem: Too Slow, Feels Laggy
**Solution**:
1. Decrease Buffer Delay by 100ms
2. Check Performance tab for cutoff rate
3. Find sweet spot where rate stays < 10%

### Problem: False Triggers in Quiet Pauses
**Solution**:
1. Increase Silence Threshold (e.g., -45dB → -40dB)
2. This makes detection less sensitive

### Problem: Not Detecting End of Speech
**Solution**:
1. Decrease Silence Threshold (e.g., -40dB → -48dB)
2. This makes detection more sensitive

---

## Technical Notes

### Buffer vs Pipeline Safety Margin
The system has a 256ms audio pipeline buffer. Your configured buffer delay should ideally be >= 300ms for safety margin:

| Your Setting | Pipeline | Safety Margin | Risk Level |
|--------------|----------|---------------|------------|
| 250ms | 256ms | -6ms ⚠️ | High |
| 500ms | 256ms | +244ms | Low |
| 1000ms | 256ms | +744ms | None |

### Why PTT Allows Aggressive Buffers
Your Push-to-Talk design adds a natural human pause:
1. User stops speaking
2. User consciously releases button (~100-300ms delay)
3. Buffer processes final audio

This "human buffer" makes 250ms viable even though it's technically below the pipeline threshold.

---

## Keyboard Shortcuts (Future)
- `Ctrl+,` - Open Settings
- `Ctrl+Shift+L` - Export Logs
- `Ctrl+Shift+M` - Toggle Monitoring
- `Ctrl+Shift+R` - Reset to Defaults

---

## Best Practices

1. **Test Before Production**: Always A/B test new buffer settings with real users
2. **Monitor First Week**: Keep real-time monitoring ON during initial rollout
3. **Export Baselines**: Save performance logs for each major config change
4. **Document Use Cases**: Note which settings work best for different scenarios
5. **Gradual Changes**: Adjust buffer by 100ms increments, not 500ms jumps

---

## Advanced: Performance Metrics Explained

### Average Response Time
Total time from button release to AI response start:
- Buffer delay (your setting)
- Network latency (~50-200ms)
- AI processing (~200-500ms)

**Formula**: `Response Time = Buffer + Network + AI`

Example with 500ms buffer:
- 500ms (buffer) + 100ms (network) + 300ms (AI) = **900ms total**

### Cutoff Rate
Percentage of sessions where trailing words were lost:
- **0-5%**: Excellent (acceptable loss)
- **5-10%**: Good (monitor closely)
- **10-20%**: Poor (increase buffer)
- **20%+**: Critical (revert immediately)

---

## FAQ

**Q: Can I change settings during an active call?**  
A: Yes, but the voice engine will restart. Any in-flight audio will be lost.

**Q: Do settings persist across sessions?**  
A: Currently no. We're working on user-specific preference storage.

**Q: Can I have different settings for different businesses?**  
A: Not yet. Settings are currently global per session.

**Q: What happens if I close the panel with unsaved changes?**  
A: Changes are only applied when you click "Apply Settings". Closing discards edits.

**Q: Is there a "Safe Mode" if I mess up?**  
A: Yes! Click "Reset to Defaults" to restore recommended values instantly.

---

**Last Updated**: 2026-02-17  
**Version**: 1.0.0  
**Contact**: Clear Voice Technology Team
