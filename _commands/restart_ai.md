doppler run -- pm2 restart all --update-env
[PM2] Applying action restartProcessId on app [all](ids: [ 5, 6, 8 ])
[PM2] [aibizbot-dev.gatewayglobal.ai](5) ✓
[PM2] [aibizbot.gatewayglobal.ai](6) ✓
[PM2] [aibizbot-stage.gatewayglobal.ai](8) ✓
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 5  │ aibizbot-dev.gate… │ fork     │ 6    │ online    │ 0%       │ 17.6mb   │
│ 8  │ aibizbot-stage.ga… │ fork     │ 3    │ online    │ 0%       │ 4.1mb    │
│ 6  │ aibizbot.gatewayg… │ fork     │ 4    │ online    │ 0%       │ 17.6mb   │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘