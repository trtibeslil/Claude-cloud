// Telefonun kendi metin tanıması: iPhone'da Apple Vision, Android'de Google ML Kit (expo-text-extractor).
// Yapay zekâ ya da internet gerekmez.
//
// ŞU AN KAPALI. Açmak için (ayrıntı: src/ocr/README.md):
//   1. OCR_ENABLED = true
//   2. package.json > expo.autolinking.exclude listesinden "expo-text-extractor"ı çıkar
//   3. Yeni bir derleme al (eas build); Expo Go'da çalışmaz.
export const OCR_ENABLED = false;

export async function recognizeText(uri: string): Promise<string[]> {
  if (!OCR_ENABLED) throw new Error('Fiş okuma henüz açılmadı.');
  // Modül yalnızca açıkken yüklenir; kapalıyken yerel (native) kısmı uygulamaya bağlanmaz.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { extractTextFromImage, isSupported } = require('expo-text-extractor') as typeof import('expo-text-extractor');
  if (!isSupported) throw new Error('Bu cihaz metin tanımayı desteklemiyor.');
  return extractTextFromImage(uri);
}
