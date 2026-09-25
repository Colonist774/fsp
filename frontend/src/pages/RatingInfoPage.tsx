import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

const competitionRatingRows = [
  {
    place: "1 место",
    federal: 500,
    interregional: 300,
    regional: 200,
  },
  {
    place: "2 место",
    federal: 400,
    interregional: 250,
    regional: 150,
  },
  {
    place: "3 место",
    federal: 300,
    interregional: 150,
    regional: 100,
  },
  {
    place: "4–5 место",
    federal: 200,
    interregional: 100,
    regional: 50,
  },
  {
    place: "6–10 место",
    federal: 100,
    interregional: 50,
    regional: 25,
  },
  {
    place: "11 место и ниже",
    federal: 0,
    interregional: 0,
    regional: 0,
  },
];

const qualificationRows = [
  ["Заслуженный мастер спорта России (ЗМС)", 5000],
  [
    "Мастер спорта России международного класса (МСМК): Гроссмейстер России",
    4000,
  ],
  ["Мастер спорта России (МС)", 3000],
  ["Кандидат в мастера спорта России (КМС)", 2000],
  ["1-й спортивный разряд", 1500],
  ["2-й спортивный разряд", 1000],
  ["3-й спортивный разряд", 800],
  ["1-й юношеский разряд", 500],
  ["2-й юношеский разряд", 400],
  ["3-й юношеский разряд", 300],
] as const;

export default function RatingInfoPage() {
  return (
    <>
      <Navbar />

      <main className="page rating-info-page">
        <Link className="rating-info-back" to="/rating">
          ← К рейтингу
        </Link>

        <div className="rating-info-heading">
          <h1>Как строится рейтинг?</h1>
          <p>
            Рейтинг спортсмена складывается из баллов за результаты
            соревнований и баллов за спортивное звание или разряд.
          </p>
        </div>

        <section className="rating-info-section">
          <div className="rating-info-section-heading">
            <h2>Баллы за соревнования</h2>
            <p>
              Баллы начисляются за итоговое место. Чем выше уровень
              соревнования, тем больше баллов приносит результат.
            </p>
          </div>

          <div className="rating-info-table-wrap">
            <div className="rating-info-competition-table">
              <div className="rating-info-competition-header">
                <span>Место</span>
                <span>
                  Чемпионат / Кубок России
                  <small>или Всероссийское</small>
                </span>
                <span>Межрегиональное</span>
                <span>
                  Чемпионат / Кубок региона
                  <small>или Региональное</small>
                </span>
              </div>

              {competitionRatingRows.map((row) => (
                <div
                  className="rating-info-competition-row"
                  key={row.place}
                >
                  <strong>{row.place}</strong>
                  <span>{row.federal}</span>
                  <span>{row.interregional}</span>
                  <span>{row.regional}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rating-info-section">
          <div className="rating-info-section-heading">
            <h2>Баллы за спортивное звание или разряд</h2>
            <p>
              Эти баллы добавляются к рейтингу один раз в соответствии
              с текущим подтверждённым званием или разрядом спортсмена.
            </p>
          </div>

          <div className="rating-info-qualification-table">
            <div className="rating-info-qualification-header">
              <span>Спортивное звание / разряд</span>
              <span>Баллы</span>
            </div>

            {qualificationRows.map(([label, points]) => (
              <div
                className="rating-info-qualification-row"
                key={label}
              >
                <span>{label}</span>
                <strong>+{points}</strong>
              </div>
            ))}
          </div>
        </section>

        <div className="rating-info-formula">
          <strong>Итоговый рейтинг</strong>
          <span>
            Баллы за все результаты соревнований + баллы за текущее
            спортивное звание или разряд.
          </span>
        </div>
      </main>
    </>
  );
}
