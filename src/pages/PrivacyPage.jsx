import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

function Section({ title, children }) {
  return (
    <section className="mt-7 first:mt-6">
      <h2 className="m-0 mb-2 font-bold text-[17px] tracking-tight" style={{ color: 'var(--lp-text)' }}>{title}</h2>
      <div className="flex flex-col gap-2.5 text-[14.5px] leading-relaxed" style={{ color: 'var(--lp-text-dim)' }}>
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="lp min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold no-underline mb-4" style={{ color: 'var(--lp-text-mute)' }}>
          <ArrowLeft size={15} /> მთავარზე დაბრუნება
        </Link>
        <div className="lp-card p-6 sm:p-9">
          <span className="w-11 h-11 rounded-xl grid place-items-center mb-4" style={{ background: 'var(--lp-grad-soft)', color: 'var(--lp-accent)' }}>
            <ShieldCheck size={22} />
          </span>
          <h1 className="m-0 font-extrabold tracking-tight text-[clamp(1.6rem,3vw,2.2rem)]" style={{ color: 'var(--lp-text)' }}>
            კონფიდენციალურობის პოლიტიკა
          </h1>
          <p className="mt-1.5 mb-0 text-[13px]" style={{ color: 'var(--lp-text-mute)' }}>
            ბოლო განახლება: 2026 წლის 31 ივლისი
          </p>

          <Section title="1. რა მონაცემებს ვაგროვებთ">
            <p>
              TeacherConnect აგროვებს მხოლოდ იმ ინფორმაციას, რომელიც აუცილებელია სერვისის გასაწევად: სახელი,
              ელ-ფოსტა, ტელეფონის ნომერი, პროფილის ფოტო, ასევე რეპეტიტორის შემთხვევაში — საგნები, ფასი,
              ქალაქი და ხელმისაწვდომობა. ტექნიკურ დონეზე ვაგროვებთ ანონიმურ სტატისტიკას (IP, ბრაუზერის ტიპი)
              უსაფრთხოებისა და გაუმჯობესებისთვის.
            </p>
          </Section>

          <Section title="2. როგორ ვიყენებთ მონაცემებს">
            <p>
              მონაცემები გამოიყენება ანგარიშის მართვის, მოსწავლესა და რეპეტიტორს შორის დაკავშირების, ხარისხის
              გაუმჯობესებისა და უსაფრთხოების უზრუნველყოფის მიზნით. ჩვენ <span className="font-semibold" style={{ color: 'var(--lp-text)' }}>არასდროს</span> ვყიდით
              თქვენს პერსონალურ მონაცემებს მესამე მხარეზე.
            </p>
          </Section>

          <Section title="3. მონაცემთა დაცვა და დაშიფვრა">
            <p>
              მონაცემთა გადაცემა ხდება დაშიფრული HTTPS/TLS არხით. პაროლები ინახება უსაფრთხო, ცალმხრივი
              ჰეშირების (hashing) ალგორითმით და არასდროს ინახება ღია სახით. წვდომა შიდა სისტემებზე შეზღუდულია
              და კონტროლდება.
            </p>
          </Section>

          <Section title="4. Cookie-ს გამოყენება">
            <p>
              პლატფორმა იყენებს cookie-ებს სესიის შესანარჩუნებლად (მაგ. სისტემაში დარჩენა) და მომხმარებლის
              პრეფერენციების დასამახსოვრებლად (მაგ. ღია/მუქი თემა). ბრაუზერის პარამეტრებიდან შესაძლებელია
              cookie-ების მართვა ან გათიშვა, თუმცა ამან შესაძლოა შეზღუდოს ზოგიერთი ფუნქცია.
            </p>
          </Section>

          <Section title="5. მონაცემთა გაზიარება">
            <p>
              თქვენი საჯარო პროფილის ინფორმაცია (სახელი, საგნები, რეიტინგი) ხილვადია სხვა მომხმარებლებისთვის.
              საკონტაქტო მონაცემები ხდება ხელმისაწვდომი მხოლოდ პლატფორმის წესების შესაბამისად. მონაცემებს
              ვუზიარებთ მესამე მხარეს მხოლოდ კანონით გათვალისწინებულ შემთხვევებში.
            </p>
          </Section>

          <Section title="6. თქვენი უფლებები">
            <p>
              თქვენ გაქვთ უფლება ნებისმიერ დროს ნახოთ, შეასწოროთ ან წაშალოთ თქვენი პერსონალური მონაცემები,
              აგრეთვე მოითხოვოთ ანგარიშის სრული დახურვა. მოთხოვნის შემთხვევაში დაგვიკავშირდით{' '}
              <Link to="/contact" className="font-semibold no-underline" style={{ color: 'var(--lp-accent)' }}>კონტაქტის გვერდზე</Link>.
            </p>
          </Section>

          <Section title="7. ცვლილებები პოლიტიკაში">
            <p>
              წინამდებარე პოლიტიკა შესაძლოა პერიოდულად განახლდეს. ცვლილებები აისახება ამ გვერდზე განახლების
              თარიღის მითითებით.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
