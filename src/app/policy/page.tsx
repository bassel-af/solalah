import type { Metadata } from 'next';
import styles from './policy.module.css';

export const metadata: Metadata = {
  title: 'السياسات والشروط | Policies',
  description: 'سياسة الاستخدام والخصوصية لمنصة سلالة',
};

export default function PolicyPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.pageTitle}>السياسات والشروط</h1>
        <p className={styles.pageSubtitle}>Policies &amp; Terms</p>

        {/* Terms of Service */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>سياسة الاستخدام / Terms of Service</h2>

          <div className={styles.arabicBlock}>
            <p>
              منصة سلالة هي منصة عائلية خاصة مصممة لتوثيق الأنساب والتواصل بين
              أفراد العائلة. باستخدامك للمنصة، فإنك توافق على الشروط التالية:
            </p>
            <p>
              يقتصر استخدام المنصة على أفراد العائلة المدعوين فقط. يُمنع مشاركة
              بيانات الدخول مع أشخاص غير مصرح لهم.
            </p>
            <p>
              أنت مسؤول عن دقة المعلومات التي تضيفها إلى شجرة العائلة والمحتوى
              الذي تنشره على المنصة.
            </p>
            <p>
              يحق لمديري المساحات إدارة الأعضاء والمحتوى وفقاً لصلاحياتهم.
              يُحتفظ بسجل تعديلات لجميع التغييرات على شجرة العائلة.
            </p>
            <p>
              نحتفظ بالحق في تعليق أو إنهاء الحسابات التي تنتهك هذه الشروط أو
              تُسيء استخدام المنصة.
            </p>
          </div>

          <div className={styles.englishBlock}>
            <p className={styles.englishLabel}>English</p>
            <p>
              Solalah is a private family platform designed for genealogy
              documentation and family communication. By using the platform, you
              agree to the following terms:
            </p>
            <p>
              Access is restricted to invited family members only. Sharing login
              credentials with unauthorized individuals is prohibited.
            </p>
            <p>
              You are responsible for the accuracy of information you add to the
              family tree and content you publish on the platform.
            </p>
            <p>
              Workspace administrators may manage members and content according
              to their permissions. An edit log is maintained for all family tree
              changes.
            </p>
            <p>
              We reserve the right to suspend or terminate accounts that violate
              these terms or misuse the platform.
            </p>
          </div>
        </section>

        {/* Privacy Policy */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>سياسة الخصوصية / Privacy Policy</h2>

          <div className={styles.arabicBlock}>
            <p>
              نحن نأخذ خصوصية بياناتك على محمل الجد. جميع البيانات المخزنة على
              المنصة تبقى على خوادمنا الخاصة ولا تُشارك مع أي طرف ثالث.
            </p>
            <p>
              نجمع فقط المعلومات الضرورية لتشغيل المنصة: البريد الإلكتروني،
              الاسم، وبيانات شجرة العائلة التي تضيفها.
            </p>
            <p>
              لا نستخدم أي أدوات تتبع أو تحليلات من طرف ثالث. لا نبيع أو نشارك
              بياناتك مع أي جهة خارجية تحت أي ظرف.
            </p>
            <p>
              يمكنك طلب حذف حسابك وجميع بياناتك المرتبطة به في أي وقت عن طريق
              التواصل مع مدير المنصة.
            </p>
            <p>
              بيانات شجرة عائلتك مشفّرة بالكامل على خوادمنا بمفتاح خاص بكل
              عائلة. الأسماء، التواريخ، الأحداث، وسجل التعديلات جميعها محمية
              بتشفير من المستوى المصرفي. يتم تأمين الاتصال عبر بروتوكول HTTPS.
            </p>
          </div>

          <div className={styles.englishBlock}>
            <p className={styles.englishLabel}>English</p>
            <p>
              We take your data privacy seriously. All data stored on the
              platform remains on our own servers and is never shared with any
              third party.
            </p>
            <p>
              We only collect information necessary to operate the platform:
              email address, display name, and family tree data you provide.
            </p>
            <p>
              We do not use any third-party tracking or analytics tools. We never
              sell or share your data with any external party under any
              circumstances.
            </p>
            <p>
              You may request deletion of your account and all associated data
              at any time by contacting the platform administrator.
            </p>
            <p>
              Your family tree data is fully encrypted on our servers with a
              dedicated key per family workspace. Names, dates, events, and the
              edit history are all protected with bank-grade encryption.
              Communication is secured via HTTPS.
            </p>
          </div>
        </section>

        {/* Storage & Billing Policy */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            سياسة التخزين والفوترة / Storage &amp; Billing Policy
          </h2>

          <div className={styles.arabicBlock}>
            <p>
              المنصة مجانية الاستخدام حالياً لجميع أفراد العائلة المدعوين.
            </p>
            <p>
              تحصل كل مساحة عمل على حصة تخزين قدرها 5 جيجابايت تشمل الصور
              والوسائط المرفوعة. يمكن لمديري المساحات متابعة استهلاك التخزين من
              لوحة الإدارة.
            </p>
            <p>
              نحتفظ بالحق في تعديل سياسة التسعير أو حصص التخزين مستقبلاً. في
              حال إجراء أي تغييرات، سيتم إخطار جميع المستخدمين قبل 30 يوماً على
              الأقل من تاريخ التطبيق.
            </p>
            <p>
              في حال تجاوز حصة التخزين، لن يتم حذف أي بيانات موجودة، لكن لن
              يكون بالإمكان رفع ملفات جديدة حتى يتم تحرير مساحة كافية.
            </p>
          </div>

          <div className={styles.englishBlock}>
            <p className={styles.englishLabel}>English</p>
            <p>
              The platform is currently free to use for all invited family
              members.
            </p>
            <p>
              Each workspace receives a 5GB storage quota for uploaded photos and
              media. Workspace administrators can monitor storage usage from the
              admin panel.
            </p>
            <p>
              We reserve the right to modify pricing or storage quotas in the
              future. Any changes will be communicated to all users at least 30
              days before taking effect.
            </p>
            <p>
              If the storage quota is exceeded, no existing data will be deleted,
              but new file uploads will be blocked until sufficient space is
              freed.
            </p>
          </div>
        </section>

        <p className={styles.lastUpdated}>
          آخر تحديث: أبريل 2026 &mdash; Last updated: April 2026
        </p>
      </div>
    </div>
  );
}
