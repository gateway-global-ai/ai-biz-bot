# Tool Integration Flow Diagram

## Complete Voice-to-Tool Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as ConciergePanel
    participant Client as GeminiStreamingClient
    participant Server as Node.js Server
    participant Gemini as Gemini 2.5 API
    participant Google as Google Places API
    
    User->>UI: Speaks "Show me coffee shops"
    UI->>Client: Start audio stream
    Client->>Server: WebSocket audio frames
    Server->>Gemini: realtime_input
    Gemini->>Server: tool_call: search_local_business
    Server->>Google: searchText API call
    Google-->>Server: Place IDs + coordinates
    Server->>Client: tool_response with map data
    Client->>UI: Render MapTool in 40% window
    UI->>User: Display map + AI voice response
    
    alt User selects location
        User->>UI: Click place in Place Picker
        UI->>Client: confirm_location_selection
        Client->>Server: tool_response
        Server->>Gemini: Location confirmed
        Gemini->>Server: Acknowledgment response
        Server->>Client: Voice + text response
        Client->>UI: Show success animation
    end
```

## Manual Input Correction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as ConciergePanel
    participant Client as GeminiStreamingClient
    participant Server as Node.js Server
    participant Gemini as Gemini 2.5 API
    
    User->>UI: Speaks address (low confidence)
    UI->>Client: Audio stream
    Client->>Server: Audio frames
    Server->>Gemini: realtime_input
    Gemini->>Server: tool_call: request_manual_input
    Server->>Client: Tool call metadata
    Client->>UI: Render ManualCorrectionBox
    UI->>User: Display input form
    
    User->>UI: Types correct address
    User->>UI: Clicks SAVE
    UI->>Client: Submit corrected value
    Client->>Server: tool_response with correction
    Server->>Gemini: Corrected value
    Gemini->>Server: Acknowledgment + next action
    Server->>Client: Voice response
    Client->>UI: Show SuccessAnimation
    UI->>User: Visual confirmation
```

## Tool Router Decision Tree

```mermaid
graph TD
    Start[Message Received] --> Check{Has tool_type?}
    Check -->|No| TextBubble[Render Text Bubble]
    Check -->|Yes| CheckCompleted{Completed?}
    CheckCompleted -->|Yes| ShowResult[Show Corrected Value]
    CheckCompleted -->|No| RouteTool{Route by tool_type}
    
    RouteTool -->|map| MapTool[Render MapTool]
    RouteTool -->|input_form| ManualInput[Render ManualCorrectionBox]
    RouteTool -->|catalog| Catalog[Render Catalog Grid]
    RouteTool -->|loading| Skeleton[Render MapSkeleton]
    
    MapTool --> WaitUser[Wait for User Interaction]
    ManualInput --> WaitSubmit[Wait for Form Submit]
    Catalog --> DisplayItems[Display Items]
    Skeleton --> LoadData[Load Tool Data]
    
    WaitSubmit --> Submit[onSubmit Handler]
    Submit --> UpdateMessage[Update Message Metadata]
    UpdateMessage --> ShowSuccess[Show SuccessAnimation]
    ShowSuccess --> SendResponse[Send tool_response to Gemini]
```

## Component Hierarchy

```mermaid
graph TD
    ConciergePanel[ConciergePanel] --> ContentWindow[40% Content Window]
    ContentWindow --> MessageList[Message List]
    MessageList --> MessageItem[Message Item]
    MessageItem --> CheckTool{Has Tool?}
    
    CheckTool -->|Yes| ToolRouter[ToolRouter]
    CheckTool -->|No| TextBubble[Text Bubble]
    
    ToolRouter --> MapTool[MapTool]
    ToolRouter --> ManualInput[ManualCorrectionBox]
    ToolRouter --> Catalog[Catalog Display]
    ToolRouter --> Skeleton[MapSkeleton]
    
    MapTool --> APIProvider[APIProvider]
    APIProvider --> Map[Google Map]
    Map --> AdvancedMarker[AdvancedMarker]
    
    ManualInput --> SuccessAnim[SuccessAnimation]
    SuccessAnim --> Confetti[Confetti Effect]
    
    ConciergePanel --> Visualizer[20% Visualizer]
    Visualizer --> WaveBars[Wave Visualization]
    Visualizer --> StatusText[Status Text]
    
    ConciergePanel --> Footer[25% Footer]
    Footer --> PTTButton[PTT Button]
```

## Server-Side Tool Execution Flow

```mermaid
graph LR
    WebSocket[WebSocket Message] --> Parse[Parse tool_call]
    Parse --> Route{Route by tool name}
    
    Route -->|search_local_business| PlacesHandler[Places Handler]
    Route -->|request_manual_input| ManualInputHandler[Manual Input Handler]
    Route -->|confirm_location_selection| LocationHandler[Location Handler]
    
    PlacesHandler --> GoogleAPI[Google Places API]
    GoogleAPI --> FormatData[Format Response]
    FormatData --> SendResponse[Send tool_response]
    
    ManualInputHandler --> ValidateInput[Validate Input]
    ValidateInput --> StoreData[Store Corrected Data]
    StoreData --> SendResponse
    
    LocationHandler --> UpdateContext[Update Context]
    UpdateContext --> SendResponse
    
    SendResponse --> Gemini[Gemini API]
    SendResponse --> Client[Client WebSocket]
```

## Animation State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle: Component Mounted
    Idle --> Loading: Tool Call Received
    Loading --> Rendering: Data Loaded
    Rendering --> Active: Component Rendered
    Active --> Submitting: User Action
    Submitting --> Success: Submit Success
    Submitting --> Error: Submit Failed
    Success --> Animating: Show Animation
    Animating --> Complete: Animation Done
    Complete --> [*]
    Error --> Active: Retry
    Active --> Cancelled: User Cancel
    Cancelled --> [*]
```

## Data Flow Architecture

```mermaid
graph TB
    subgraph Client
        UI[ConciergePanel UI]
        ToolRouter[Tool Router]
        Components[Tool Components]
    end
    
    subgraph Server
        WebSocketServer[WebSocket Server]
        ToolHandlers[Tool Handlers]
        ExternalAPIs[External APIs]
    end
    
    subgraph Gemini
        GeminiAPI[Gemini 2.5 API]
        ToolCalls[Tool Calls]
    end
    
    UI -->|User Input| WebSocketServer
    WebSocketServer -->|Audio Stream| GeminiAPI
    GeminiAPI -->|tool_call| WebSocketServer
    WebSocketServer -->|Route| ToolHandlers
    ToolHandlers -->|API Call| ExternalAPIs
    ExternalAPIs -->|Data| ToolHandlers
    ToolHandlers -->|tool_response| GeminiAPI
    ToolHandlers -->|Metadata| WebSocketServer
    WebSocketServer -->|Tool Data| UI
    UI -->|Render| ToolRouter
    ToolRouter -->|Display| Components
```
