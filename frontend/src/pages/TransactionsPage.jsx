// Islemler: bir satis/kiralamanin ilk gorusmeden tapuya kadarki tum
// surecini asama asama takip eden bir "islem akisi" (pipeline) ekrani.
// Komisyonlar sayfasindan farkli olarak, bu ekran finansal kaydi degil,
// surecin KENDISINI (asamalarini) takip eder.
export default function TransactionsPage() {
  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>İşlemler</h2>
      <div className="folder-panel">
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Bu bölüm yakında detaylandırılacak: bir satış/kiralama sürecinin aşamalarını
          (görüşme → teklif → sözleşme → tapu) takip eden bir işlem akışı panosu
          burada yer alacak.
        </p>
      </div>
    </div>
  );
}
