export default function SsoErrorPage() {
  return (
    <>
      <p className="sr-only">Tidak ada sesi aktif.</p>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if (window.parent !== window) {
              window.parent.postMessage({ type: "teman-belajar:sso-check-complete" }, window.location.origin);
            }
          `,
        }}
      />
    </>
  );
}
