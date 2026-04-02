#!/bin/bash
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
cd "/Users/yiakio/Desktop/work space-me/双向转诊/referral-prototype"
exec /usr/local/bin/node node_modules/.bin/vite --port 5173
