# Message Board Notification System Test Plan

## Features Implemented

### 1. Renamed "Bulletin Board" to "Message Board"
- ✅ Tab button now shows "📬 Message Board"
- ✅ Header shows "Chapter Message Board"

### 2. Red Dot Notification on Tab
- ✅ Shows red dot when there are new messages from other users
- ✅ Red dot appears in the top-right corner of the tab text
- ✅ Only counts messages posted after last viewed timestamp
- ✅ Does not count user's own messages

### 3. Last Viewed Timestamp Tracking
- ✅ Stores timestamp in localStorage with key: `messageBoard_lastViewed_${userId}`
- ✅ Updates timestamp when user clicks on Message Board tab
- ✅ Persists across browser sessions

### 4. Visual Indicators for New Messages
- ✅ New messages have light blue background (#f0f8ff)
- ✅ New messages have blue border (2px solid #4da6ff)
- ✅ "NEW" badge appears in top-right corner of new messages
- ✅ Only shows for messages from other users

### 5. New Message Count Calculation
- ✅ Uses `useMemo` for efficient recalculation
- ✅ Filters messages by timestamp and excludes user's own messages
- ✅ Updates automatically when new messages arrive

## Test Scenarios

### Test 1: Initial Load
1. User logs in for the first time
2. Navigate to Message Board
3. All existing messages should appear as normal (not highlighted as new)
4. No red dot should appear on the tab

### Test 2: New Message from Another User
1. User A is viewing a different tab
2. User B posts a new message
3. User A should see a red dot on the Message Board tab
4. When User A clicks on Message Board:
   - Red dot disappears
   - New message appears with blue background and "NEW" badge
   - Timestamp is updated in localStorage

### Test 3: User's Own Messages
1. User posts a message
2. No red dot should appear
3. User's own message should not be highlighted as new

### Test 4: Multiple New Messages
1. Multiple users post messages while current user is away
2. Red dot appears on Message Board tab
3. All new messages are highlighted when viewing

### Test 5: Persistence Across Sessions
1. User has unread messages (red dot visible)
2. User closes browser
3. User reopens browser and logs in
4. Red dot should still be visible with correct count

### Test 6: Real-time Updates
1. User is viewing Message Board
2. Another user posts a message
3. New message should appear immediately
4. No red dot (since user is already viewing)
5. Message should not be highlighted as new (since user is actively viewing)

## Implementation Details

### Key Components:
- `lastViewedTimestamp` - State variable tracking last view time
- `newMessageCount` - Computed value for unread messages
- `localStorage` - Persistence mechanism
- Visual styling for new messages and notifications

### Edge Cases Handled:
- Empty message board
- User's own messages
- Invalid timestamps
- Missing user data
- First-time users (no stored timestamp)