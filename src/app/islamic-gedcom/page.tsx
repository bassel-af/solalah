import type { Metadata } from 'next';
import styles from './islamic-gedcom.module.css';

export const metadata: Metadata = {
  title: 'معيار GEDCOM الإسلامي | Islamic GEDCOM Standard',
  description: 'علامات مخصصة لتوثيق الأنساب الإسلامية في صيغة GEDCOM',
};

export default function IslamicGedcomPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.pageTitle}>معيار GEDCOM الإسلامي</h1>
        <p className={styles.pageSubtitle}>
          علامات مخصصة وربط للعلامات القياسية في صيغة GEDCOM (5.5.1 و 7.0)
          لتوثيق الأنساب بما يتوافق مع المفاهيم الشرعية الإسلامية.
        </p>

        {/* ─── Custom Tags ─── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>العلامات المخصصة</h2>
          <p className={styles.desc}>
            علامات غير موجودة في معيار GEDCOM الرسمي، أُنشئت لتغطية احتياجات
            التوثيق الإسلامي. تبدأ بشرطة سفلية وفق اتفاقية GEDCOM للعلامات المخصصة.
            متوافقة مع GEDCOM 5.5.1 و 7.0.
          </p>

          {/* _HIJR */}
          <div className={styles.tagBlock}>
            <div className={styles.tagHeader}>
              <span className={`${styles.tagBadge} ${styles.tagBadgeCustom}`}>_HIJR</span>
              <span className={styles.tagName}>التاريخ الهجري</span>
            </div>
            <p className={styles.tagDesc}>
              يُستخدم لتسجيل التاريخ بالتقويم الهجري بجانب التاريخ الميلادي.
              يوضع كعلامة فرعية تحت أي حدث (ولادة، وفاة، زواج، عقد، طلاق).
            </p>
            <div className={styles.codeBlock}>
              <span className={styles.codeTag}>1 BIRT</span>{'\n'}
              <span className={styles.codeTag}>2 DATE</span> <span className={styles.codeVal}>1 JAN 1990</span>{'\n'}
              <span className={styles.codeCustomTag}>2 _HIJR</span> <span className={styles.codeVal}>15/05/1410</span>{'\n'}
              <span className={styles.codeTag}>2 PLAC</span> <span className={styles.codeVal}>مكة المكرمة</span>
            </div>
            <div className={styles.note}>
              الصيغة: يوم/شهر/سنة هجرية. مثال: 15/05/1410
            </div>
          </div>
        </section>

        {/* ─── Standard Tags for Islamic Events ─── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>العلامات القياسية لأحداث الزواج</h2>
          <p className={styles.desc}>
            علامات موجودة في معيار GEDCOM الرسمي (5.5.1 و 7.0) وتتوافق مباشرة مع مراحل الزواج الإسلامي.
            توضع تحت سجل العائلة (FAM).
          </p>

          {/* MARC */}
          <div className={styles.tagBlock}>
            <div className={styles.tagHeader}>
              <span className={`${styles.tagBadge} ${styles.tagBadgeStandard}`}>MARC</span>
              <span className={styles.tagName}>عقد القران (النكاح)</span>
            </div>
            <p className={styles.tagDesc}>
              العقد الشرعي الذي يُوقَّع بحضور الولي والشهود مع تحديد المهر.
              هذا هو الحدث الذي يصبح فيه الزوجان مرتبطين شرعاً.
            </p>
            <div className={styles.codeBlock}>
              <span className={styles.codeId}>0 @F1@ FAM</span>{'\n'}
              <span className={styles.codeTag}>1 MARC</span>{'\n'}
              <span className={styles.codeTag}>2 DATE</span> <span className={styles.codeVal}>11 JUL 2022</span>{'\n'}
              <span className={styles.codeCustomTag}>2 _HIJR</span> <span className={styles.codeVal}>12/02/1443</span>{'\n'}
              <span className={styles.codeTag}>2 PLAC</span> <span className={styles.codeVal}>الرياض</span>
            </div>
          </div>

          {/* MARR */}
          <div className={styles.tagBlock}>
            <div className={styles.tagHeader}>
              <span className={`${styles.tagBadge} ${styles.tagBadgeStandard}`}>MARR</span>
              <span className={styles.tagName}>حفل الزفاف (الوليمة)</span>
            </div>
            <p className={styles.tagDesc}>
              حفل الزفاف والوليمة — الاحتفال العلني بالزواج.
              غالباً يكون بعد عقد القران بأيام أو أشهر.
            </p>
            <div className={styles.codeBlock}>
              <span className={styles.codeId}>0 @F1@ FAM</span>{'\n'}
              <span className={styles.codeTag}>1 MARR</span>{'\n'}
              <span className={styles.codeTag}>2 DATE</span> <span className={styles.codeVal}>27 APR 2023</span>{'\n'}
              <span className={styles.codeCustomTag}>2 _HIJR</span> <span className={styles.codeVal}>07/10/1444</span>{'\n'}
              <span className={styles.codeTag}>2 PLAC</span> <span className={styles.codeVal}>الرياض</span>{'\n'}
              <span className={styles.codeTag}>2 NOTE</span> <span className={styles.codeVal}>حفل كبير في قاعة الاحتفالات</span>
            </div>
          </div>

          {/* DIV */}
          <div className={styles.tagBlock}>
            <div className={styles.tagHeader}>
              <span className={`${styles.tagBadge} ${styles.tagBadgeDivorce}`}>DIV</span>
              <span className={styles.tagName}>الطلاق</span>
            </div>
            <p className={styles.tagDesc}>
              إنهاء عقد الزواج. الأطفال يبقون مرتبطين بسجل العائلة بعد الطلاق.
            </p>
            <div className={styles.codeBlock}>
              <span className={styles.codeId}>0 @F1@ FAM</span>{'\n'}
              <span className={styles.codeTag}>1 MARR</span>{'\n'}
              <span className={styles.codeTag}>2 DATE</span> <span className={styles.codeVal}>15 MAR 2018</span>{'\n'}
              <span className={styles.codeTag}>1 DIV</span>{'\n'}
              <span className={styles.codeTag}>2 DATE</span> <span className={styles.codeVal}>20 NOV 2023</span>{'\n'}
              <span className={styles.codeTag}>1 HUSB</span> <span className={styles.codeId}>@I1@</span>{'\n'}
              <span className={styles.codeTag}>1 WIFE</span> <span className={styles.codeId}>@I2@</span>
            </div>
          </div>
        </section>

        {/* ─── Full Example ─── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>مثال كامل</h2>
          <p className={styles.desc}>
            عائلة مع عقد قران وحفل زفاف، كل منهما بتاريخ هجري وميلادي.
          </p>
          <div className={styles.codeBlock}>
            <span className={styles.codeId}>0 @I1@ INDI</span>{'\n'}
            <span className={styles.codeTag}>1 NAME</span> <span className={styles.codeVal}>محمد /بن عبدالله/</span>{'\n'}
            <span className={styles.codeTag}>1 SEX</span> <span className={styles.codeVal}>M</span>{'\n'}
            <span className={styles.codeTag}>1 BIRT</span>{'\n'}
            <span className={styles.codeTag}>2 DATE</span> <span className={styles.codeVal}>15 MAR 1995</span>{'\n'}
            <span className={styles.codeCustomTag}>2 _HIJR</span> <span className={styles.codeVal}>14/10/1415</span>{'\n'}
            <span className={styles.codeTag}>2 PLAC</span> <span className={styles.codeVal}>الرياض</span>{'\n'}
            <span className={styles.codeTag}>1 FAMS</span> <span className={styles.codeId}>@F1@</span>{'\n'}
            {'\n'}
            <span className={styles.codeId}>0 @I2@ INDI</span>{'\n'}
            <span className={styles.codeTag}>1 NAME</span> <span className={styles.codeVal}>نورة /بنت سعد/</span>{'\n'}
            <span className={styles.codeTag}>1 SEX</span> <span className={styles.codeVal}>F</span>{'\n'}
            <span className={styles.codeTag}>1 FAMS</span> <span className={styles.codeId}>@F1@</span>{'\n'}
            {'\n'}
            <span className={styles.codeId}>0 @F1@ FAM</span>{'\n'}
            <span className={styles.codeTag}>1 HUSB</span> <span className={styles.codeId}>@I1@</span>{'\n'}
            <span className={styles.codeTag}>1 WIFE</span> <span className={styles.codeId}>@I2@</span>{'\n'}
            <span className={styles.codeTag}>1 MARC</span>{'\n'}
            <span className={styles.codeTag}>2 DATE</span> <span className={styles.codeVal}>11 JUL 2022</span>{'\n'}
            <span className={styles.codeCustomTag}>2 _HIJR</span> <span className={styles.codeVal}>12/02/1443</span>{'\n'}
            <span className={styles.codeTag}>1 MARR</span>{'\n'}
            <span className={styles.codeTag}>2 DATE</span> <span className={styles.codeVal}>27 APR 2023</span>{'\n'}
            <span className={styles.codeCustomTag}>2 _HIJR</span> <span className={styles.codeVal}>07/10/1444</span>{'\n'}
            <span className={styles.codeTag}>2 PLAC</span> <span className={styles.codeVal}>الرياض</span>{'\n'}
            <span className={styles.codeTag}>1 CHIL</span> <span className={styles.codeId}>@I3@</span>
          </div>
        </section>

        <p className={styles.lastUpdated}>
          آخر تحديث: مارس ٢٠٢٦ &middot; الإصدار ٠.١
        </p>
      </div>
    </div>
  );
}
