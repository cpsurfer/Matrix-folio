$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
Write-Host "Benchmark & Telemetry Server active at http://localhost:8080/"

$baseDir = "C:\Users\BIT\.gemini\antigravity\scratch\Matrix-folio"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.AbsolutePath
        $targetFile = "$baseDir\qwen_benchmark.html"

        if ($path -eq "/telemetry" -or $path -eq "/telemetry_dashboard.html") {
            $targetFile = "$baseDir\telemetry_dashboard.html"
        } elseif ($path -ne "/" -and (Test-Path "$baseDir$path")) {
            $targetFile = "$baseDir$path"
        }

        if (Test-Path $targetFile) {
            $buffer = [System.IO.File]::ReadAllBytes($targetFile)
            $response.ContentType = "text/html; charset=utf-8"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    } catch {
        # Continue on errors
    }
}
