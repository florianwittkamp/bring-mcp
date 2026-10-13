// Readiness includes the tunnel connection; a running process alone is insufficient.
fetch('http://127.0.0.1:8080/readyz', { signal: AbortSignal.timeout(3000) })
  .then((response) => {
    process.exitCode = response.ok ? 0 : 1;
  })
  .catch(() => {
    process.exitCode = 1;
  });
