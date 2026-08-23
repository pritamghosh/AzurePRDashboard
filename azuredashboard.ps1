$env:JAVA_HOME="C:\Program Files\Java\jdk-25.0.2"
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"

# ⚠️ Personal Access Token (PAT) Configuration
# Option 1: Uncomment and set the PAT directly here (not recommended for security)
$pat = "YOUR_PAT_VALUE_HERE"

# Option 2: Read from environment variable (recommended - uncomment to use)
# if ($null -eq $env:AZURE_DEVOPS_PAT -or $env:AZURE_DEVOPS_PAT -eq "") {
#     Write-Host "ERROR: AZURE_DEVOPS_PAT environment variable is not set." -ForegroundColor Red
#     Write-Host "Please set the environment variable before running this script:" -ForegroundColor Yellow
#     Write-Host "`$env:AZURE_DEVOPS_PAT = 'YOUR_PAT_VALUE_HERE'" -ForegroundColor Cyan
#     exit 1
# }
# $pat = $env:AZURE_DEVOPS_PAT

# Validate PAT is set
if ($pat -eq "YOUR_PAT_VALUE_HERE" -or [string]::IsNullOrWhiteSpace($pat)) {
    Write-Host "ERROR: PAT is not configured." -ForegroundColor Red
    Write-Host "Please set one of the following:" -ForegroundColor Yellow
    Write-Host "1. Edit azuredashboard.ps1 and set `$pat = 'YOUR_ACTUAL_PAT'" -ForegroundColor Cyan
    Write-Host "2. Set environment variable: `$env:AZURE_DEVOPS_PAT = 'YOUR_ACTUAL_PAT'" -ForegroundColor Cyan
    exit 1
}

# Repository groups configuration
# Customize these groups to match your repository naming conventions
$repositoryGroups = @(
    @{
        name = "Frontend"
        prefixes = @("ui-", "web-")
    },
    @{
        name = "Backend"
        prefixes = @("api-", "service-")
    },
    @{
        name = "Infrastructure"
        prefixes = @("infra-", "platform-")
    },
    @{
        name = "Data"
        prefixes = @("data-", "analytics-")
    }
)

# Build the repository-groups argument
$groupsJson = $repositoryGroups | ConvertTo-Json -Compress
$groupsArg = "--azure.devops.repository-groups='$groupsJson'"

java -jar "$PSScriptRoot\target\azure-dashboard-1.0.0-SNAPSHOT.jar" --azure.devops.pat="$pat" $groupsArg
