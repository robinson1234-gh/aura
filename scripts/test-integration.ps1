# WorkAgent Integration Test Script
# Tests the API endpoints and WebSocket connectivity

$ErrorActionPreference = "Continue"
$BASE_URL = "http://localhost:3001"
$passed = 0
$failed = 0

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Path,
        [string]$Body,
        [int]$ExpectedStatus,
        [string]$Description
    )
    
    Write-Host -NoNewline "  TEST: $Description... "
    
    try {
        $params = @{
            Method = $Method
            Uri = "$BASE_URL$Path"
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-RestMethod @params
        
        Write-Host "PASS" -ForegroundColor Green
        $script:passed++
        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($ExpectedStatus -and $statusCode -eq $ExpectedStatus) {
            Write-Host "PASS (expected $ExpectedStatus)" -ForegroundColor Green
            $script:passed++
        } else {
            Write-Host "FAIL ($_)" -ForegroundColor Red
            $script:failed++
        }
        return $null
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WorkAgent Integration Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1. Health Check" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Path "/api/health" -Description "Health endpoint"
Write-Host ""

# Test 2: Workspace CRUD
Write-Host "2. Workspace Operations" -ForegroundColor Yellow
$tree = Test-Endpoint -Method "GET" -Path "/api/workspaces" -Description "List workspaces"
if ($tree) {
    Write-Host "     Found $($tree.Count) root workspaces" -ForegroundColor Gray
}

$newWs = Test-Endpoint -Method "POST" -Path "/api/workspaces" `
    -Body '{"name":"testdomain","level":"domain"}' `
    -Description "Create domain workspace"

if ($newWs) {
    $wsId = $newWs.id
    
    Test-Endpoint -Method "GET" -Path "/api/workspaces/$wsId" -Description "Get workspace by ID"
    
    Test-Endpoint -Method "PUT" -Path "/api/workspaces/$wsId" `
        -Body '{"name":"testdomain_renamed"}' `
        -Description "Rename workspace"
    
    # Create child
    $childWs = Test-Endpoint -Method "POST" -Path "/api/workspaces" `
        -Body "{`"name`":`"testcategory`",`"parentId`":`"$wsId`",`"level`":`"category`"}" `
        -Description "Create child workspace"
    
    # Test 3: Session CRUD
    Write-Host ""
    Write-Host "3. Session Operations" -ForegroundColor Yellow
    
    if ($childWs) {
        $childId = $childWs.id
        
        $session = Test-Endpoint -Method "POST" -Path "/api/sessions" `
            -Body "{`"workspaceId`":`"$childId`"}" `
            -Description "Create session"
        
        if ($session) {
            $sessionId = $session.id
            
            Test-Endpoint -Method "GET" -Path "/api/sessions?workspaceId=$childId" `
                -Description "List sessions for workspace"
            
            Test-Endpoint -Method "PUT" -Path "/api/sessions/$sessionId" `
                -Body '{"title":"Test Chat Renamed"}' `
                -Description "Rename session"
            
            Test-Endpoint -Method "GET" -Path "/api/sessions/$sessionId/messages" `
                -Description "Get session messages"
            
            Test-Endpoint -Method "DELETE" -Path "/api/sessions/$sessionId" `
                -Description "Delete session" -ExpectedStatus 204
        }
    }
    
    # Test 4: Config Operations
    Write-Host ""
    Write-Host "4. Config Operations" -ForegroundColor Yellow
    
    Test-Endpoint -Method "GET" -Path "/api/config/skill/tech" -Description "Get tech skills"
    Test-Endpoint -Method "GET" -Path "/api/config/soul/tech" -Description "Get tech soul"
    Test-Endpoint -Method "GET" -Path "/api/config/resolve/tech/project/project1" -Description "Resolve full config"
    
    # Cleanup
    Write-Host ""
    Write-Host "5. Cleanup" -ForegroundColor Yellow
    Test-Endpoint -Method "DELETE" -Path "/api/workspaces/$wsId" `
        -Description "Delete test workspace (cascade)" -ExpectedStatus 204
}

# Test 5: Agent List
Write-Host ""
Write-Host "6. Agent System" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Path "/api/agents" -Description "List available agents"

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Results: $passed passed, $failed failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
