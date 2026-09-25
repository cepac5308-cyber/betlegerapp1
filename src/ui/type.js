/* ============================================================
   TİPOGRAFİ
   Sistem fontu bir uygulamayı anında "şablon" gösterir.
   Başlık ve sayılarda Sora (geometrik, karakterli), gövdede
   Plus Jakarta Sans. Sayılar tabular — tablolarda rakamlar
   kaymasın diye.
   ============================================================ */
export const F = {
  display: 'Sora_700Bold',
  displaySemi: 'Sora_600SemiBold',
  num: 'Sora_600SemiBold',
  numBold: 'Sora_700Bold',
  body: 'PlusJakartaSans_400Regular',
  bodyMed: 'PlusJakartaSans_500Medium',
  bodySemi: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold'
};

/* Ölçek: her boy bir işe ait, ara boy yok. */
export const T = {
  hero:    { fontFamily: F.numBold, fontSize: 38, letterSpacing: -1.2 },
  amount:  { fontFamily: F.numBold, fontSize: 22, letterSpacing: -.5 },
  metric:  { fontFamily: F.num, fontSize: 17, letterSpacing: -.3 },
  title:   { fontFamily: F.display, fontSize: 19, letterSpacing: -.5 },
  card:    { fontFamily: F.bodyBold, fontSize: 14.5, letterSpacing: -.1 },
  row:     { fontFamily: F.bodyMed, fontSize: 13.5 },
  rowNum:  { fontFamily: F.num, fontSize: 13.5, letterSpacing: -.1 },
  body:    { fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  label:   { fontFamily: F.bodyMed, fontSize: 11.5, letterSpacing: .1 },
  caption: { fontFamily: F.body, fontSize: 11.5, lineHeight: 17 },
  tab:     { fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: .1 },
  overline:{ fontFamily: F.bodyBold, fontSize: 10.5, letterSpacing: .8, textTransform: 'uppercase' }
};
