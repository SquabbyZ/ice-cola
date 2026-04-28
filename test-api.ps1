$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$teamId = "test-team-001"

# Login
Write-Host "=== Testing Login ===" -ForegroundColor Cyan
$loginResp = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/auth/login' -Method POST -ContentType 'application/json' -Body '{"email":"test2@example.com","password":"test123456"}' -UseBasicParsing
$loginData = $loginResp.Content | ConvertFrom-Json
Write-Host "Login Response: $($loginResp.StatusCode)"
if ($loginData.success) {
    $token = $loginData.data.accessToken
    Write-Host "Token obtained: $($token.Substring(0, [Math]::Min(50, $token.Length)))..." -ForegroundColor Green

    # Test Skills API with token
    Write-Host "`n=== Testing Skills API ===" -ForegroundColor Cyan
    $headers = @{ "Authorization" = "Bearer $token" }

    # Get personal skills
    $skillsResp = Invoke-WebRequest -Uri "http://127.0.0.1:3000/teams/$teamId/skills/personal" -Method GET -Headers $headers -UseBasicParsing
    Write-Host "GET /teams/$teamId/skills/personal - Status: $($skillsResp.StatusCode)"

    # Create a skill
    Write-Host "`n=== Creating Test Skill ===" -ForegroundColor Cyan
    $createSkillBody = @{
        name = "Code Assistant"
        description = "An AI coding assistant skill"
        version = "1.0.0"
        category = "coding"
        tags = @("coding", "assistant")
        content = "# Code Assistant Skill`nThis skill helps with coding tasks."
        configSchema = '{"type":"object","properties":{"language":{"type":"string","default":"en"}}}'
    } | ConvertTo-Json

    $createResp = Invoke-WebRequest -Uri "http://127.0.0.1:3000/teams/$teamId/skills" -Method POST -ContentType 'application/json' -Headers $headers -Body $createSkillBody -UseBasicParsing
    Write-Host "CREATE Skill - Status: $($createResp.StatusCode)"
    $createdSkill = $createResp.Content | ConvertFrom-Json
    if ($createdSkill.success) {
        $skillId = $createdSkill.data.id
        Write-Host "Created Skill ID: $skillId" -ForegroundColor Green
        Write-Host "Skill Data: $($createResp.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3)" -ForegroundColor Gray

        # Get skill versions
        Write-Host "`n=== Testing Version History ===" -ForegroundColor Cyan
        $versionsResp = Invoke-WebRequest -Uri "http://127.0.0.1:3000/teams/$teamId/skills/$skillId/versions" -Method GET -Headers $headers -UseBasicParsing
        Write-Host "GET Versions - Status: $($versionsResp.StatusCode)"

        # Update skill to create new version
        Write-Host "`n=== Updating Skill ===" -ForegroundColor Cyan
        $updateBody = @{
            name = "Code Assistant"
            description = "An AI coding assistant skill - updated"
            version = "1.0.1"
            category = "coding"
            tags = @("coding", "assistant", "updated")
            content = "# Code Assistant Skill`nThis skill helps with coding tasks. Updated!"
            configSchema = '{"type":"object","properties":{"language":{"type":"string","default":"en"}}}'
        } | ConvertTo-Json

        $updateResp = Invoke-WebRequest -Uri "http://127.0.0.1:3000/teams/$teamId/skills/$skillId" -Method PUT -ContentType 'application/json' -Headers $headers -Body $updateBody -UseBasicParsing
        Write-Host "UPDATE Skill - Status: $($updateResp.StatusCode)"

        # Publish to team
        Write-Host "`n=== Testing Publish to Team ===" -ForegroundColor Cyan
        $publishResp = Invoke-WebRequest -Uri "http://127.0.0.1:3000/teams/$teamId/skills/$skillId/publish-team" -Method POST -Headers $headers -UseBasicParsing
        Write-Host "Publish to Team - Status: $($publishResp.StatusCode)"
        if ($publishResp.Content) {
            $publishData = $publishResp.Content | ConvertFrom-Json
            Write-Host "Publish Response: success=$($publishData.success)" -ForegroundColor $(if ($publishData.success) { "Green" } else { "Red" })
        }
    }

    # Get all team skills
    Write-Host "`n=== Testing Team Skills ===" -ForegroundColor Cyan
    $teamSkillsResp = Invoke-WebRequest -Uri "http://127.0.0.1:3000/teams/$teamId/skills/team" -Method GET -Headers $headers -UseBasicParsing
    Write-Host "GET Team Skills - Status: $($teamSkillsResp.StatusCode)"

    # Get marketplace skills
    Write-Host "`n=== Testing Marketplace Skills ===" -ForegroundColor Cyan
    $marketplaceResp = Invoke-WebRequest -Uri "http://127.0.0.1:3000/teams/$teamId/skills/marketplace" -Method GET -Headers $headers -UseBasicParsing
    Write-Host "GET Marketplace Skills - Status: $($marketplaceResp.StatusCode)"

    # Test DELETE skill
    if ($createdSkill.success) {
        Write-Host "`n=== Testing Delete Skill ===" -ForegroundColor Cyan
        $deleteResp = Invoke-WebRequest -Uri "http://127.0.0.1:3000/teams/$teamId/skills/$($createdSkill.data.id)" -Method DELETE -Headers $headers -UseBasicParsing
        Write-Host "DELETE Skill - Status: $($deleteResp.StatusCode)"
    }

    Write-Host "`n=== All API Tests Complete ===" -ForegroundColor Green
} else {
    Write-Host "Login failed: $($loginData.error.message)" -ForegroundColor Red
}
