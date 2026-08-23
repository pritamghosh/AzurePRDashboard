$env:JAVA_HOME="C:\Program Files\Java\jdk-25.0.2"
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"

# ⚠️ Azure DevOps Configuration
# Option 1: Uncomment and set the PAT directly here (not recommended for security)
$pat = "YOUR_PAT_VALUE_HERE"
$organization = "YOUR_ORGANIZATION_NAME"
$project = "YOUR_PROJECT_NAME"

# Option 2: Read from environment variables (recommended - uncomment to use)
# if ($null -eq $env:AZURE_DEVOPS_PAT -or $env:AZURE_DEVOPS_PAT -eq "") {
#     Write-Host "ERROR: AZURE_DEVOPS_PAT environment variable is not set." -ForegroundColor Red
#     Write-Host "Please set the environment variable before running this script:" -ForegroundColor Yellow
#     Write-Host "`$env:AZURE_DEVOPS_PAT = 'YOUR_PAT_VALUE_HERE'" -ForegroundColor Cyan
#     exit 1
# }
# $pat = $env:AZURE_DEVOPS_PAT
# $organization = $env:AZURE_DEVOPS_ORGANIZATION
# $project = $env:AZURE_DEVOPS_PROJECT

# Validate configuration is set
if ($pat -eq "YOUR_PAT_VALUE_HERE" -or [string]::IsNullOrWhiteSpace($pat)) {
    Write-Host "ERROR: PAT is not configured." -ForegroundColor Red
    Write-Host "Please set one of the following:" -ForegroundColor Yellow
    Write-Host "1. Edit azuredashboard.ps1 and set `$pat = 'YOUR_ACTUAL_PAT'" -ForegroundColor Cyan
    Write-Host "2. Set environment variable: `$env:AZURE_DEVOPS_PAT = 'YOUR_ACTUAL_PAT'" -ForegroundColor Cyan
    exit 1
}

if ($organization -eq "YOUR_ORGANIZATION_NAME" -or [string]::IsNullOrWhiteSpace($organization)) {
    Write-Host "ERROR: Organization is not configured." -ForegroundColor Red
    Write-Host "Please set one of the following:" -ForegroundColor Yellow
    Write-Host "1. Edit azuredashboard.ps1 and set `$organization = 'YOUR_ORG_NAME'" -ForegroundColor Cyan
    Write-Host "2. Set environment variable: `$env:AZURE_DEVOPS_ORGANIZATION = 'YOUR_ORG_NAME'" -ForegroundColor Cyan
    exit 1
}

if ($project -eq "YOUR_PROJECT_NAME" -or [string]::IsNullOrWhiteSpace($project)) {
    Write-Host "ERROR: Project is not configured." -ForegroundColor Red
    Write-Host "Please set one of the following:" -ForegroundColor Yellow
    Write-Host "1. Edit azuredashboard.ps1 and set `$project = 'YOUR_PROJECT_NAME'" -ForegroundColor Cyan
    Write-Host "2. Set environment variable: `$env:AZURE_DEVOPS_PROJECT = 'YOUR_PROJECT_NAME'" -ForegroundColor Cyan
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
    }
)

# Server port configuration
$serverPort = 8080

# Build the repository-groups arguments using Spring Boot's bracket notation
$groupsArgs = @()
for ($i = 0; $i -lt $repositoryGroups.Count; $i++) {
    $group = $repositoryGroups[$i]
    $groupsArgs += "--azure.devops.repository-groups[$i].name=$($group.name)"
    
    for ($j = 0; $j -lt $group.prefixes.Count; $j++) {
        $groupsArgs += "--azure.devops.repository-groups[$i].prefixes[$j]=$($group.prefixes[$j])"
    }
}

# Combine all arguments and launch
$allArgs = @(
    "--server.port=$serverPort",
    "--azure.devops.pat=$pat",
    "--azure.devops.organization=$organization",
    "--azure.devops.project=$project"
) + $groupsArgs
java -jar "$PSScriptRoot\target\azure-dashboard-1.0.0-SNAPSHOT.jar" @allArgs
