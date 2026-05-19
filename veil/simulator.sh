#!/bin/bash
xcrun simctl boot E9AADA97-0477-4D48-A938-0DAC011C6A94 2>/dev/null || true
open -a Simulator
npx expo start --ios --udid E9AADA97-0477-4D48-A938-0DAC011C6A94
