$existing = [Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'User')

if ($existing) {
  Write-Host 'OPENAI_API_KEY on juba Windows kasutaja-ENV-is olemas.'
  $replace = Read-Host 'Kas soovid selle asendada? [y/N]'
  if ($replace -notmatch '^(y|yes)$') {
    Write-Host 'Seadistus katkestati.'
    exit 0
  }
}

$secureValue = Read-Host 'Sisesta OpenAI API key' -AsSecureString
$valuePtr = [IntPtr]::Zero

try {
  $valuePtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($valuePtr)

  if ([string]::IsNullOrWhiteSpace($plainValue)) {
    throw 'OpenAI API key ei tohi olla tühi.'
  }

  if ($plainValue.StartsWith('gsk_')) {
    throw 'See näeb välja nagu Groq võti. OpenAI jaoks on vaja OpenAI API key-d.'
  }

  [Environment]::SetEnvironmentVariable('OPENAI_API_KEY', $plainValue, 'User')
  Write-Host 'OPENAI_API_KEY salvestati Windows kasutaja-ENV-i.'
  Write-Host 'Ava uus terminal või kasuta frontend npm-skripte, mis loevad selle registrist automaatselt.'
}
finally {
  if ($valuePtr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($valuePtr)
  }
}