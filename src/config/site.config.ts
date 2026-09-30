/**
 * Public site settings — the ONLY file to edit to take the site out of demo mode.
 *
 * Everything here is public by design (it ships to every browser anyway):
 * the Firebase web config identifies your project; Firestore Security Rules protect the data.
 * Repository variables (VITE_*) in GitHub Actions override these values when set.
 *
 * Firebase console → Project settings → General → Your apps → Web app → "SDK setup and configuration" → Config.
 */
export const siteConfig = {
  firebase: {
    apiKey: 'AIzaSyBJ2XLyMTYdhHHxzmq-E7TYVX8NV1qoIac',
    authDomain: 'sadhana-sanskritam.firebaseapp.com',
    projectId: 'sadhana-sanskritam',
    storageBucket: 'sadhana-sanskritam.firebasestorage.app',
    messagingSenderId: '754695866552',
    appId: '1:754695866552:web:d08479177fe70b38af4c4d',
  },
  /** Your UPI ID (ideally a business/merchant VPA) and the name registered on it. */
  upi: { vpa: '', payeeName: 'Sadhana Sanskritam' },
  contact: {
    email: 'hello@sadhanasanskritam.org',
    whatsapp: '',
    whatsappChannelUrl: '',
    adminAlertEmail: '',
  },
  /** EmailJS public browser credentials (optional; emails are mocked until set). */
  emailjs: { publicKey: '', serviceId: '', templateId: '' },
};
