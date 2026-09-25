import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

const competitionRatingRows = [
  { place: "1 место", regional: 100, regionalCup: 150, interregional: 200, allRussian: 300, russia: 400 },
  { place: "2 место", regional: 75, regionalCup: 115, interregional: 150, allRussian: 225, russia: 300 },
  { place: "3 место", regional: 60, regionalCup: 90, interregional: 120, allRussian: 180, russia: 240 },
  { place: "4 место", regional: 50, regionalCup: 75, interregional: 100, allRussian: 150, russia: 200 },
  { place: "5 место", regional: 40, regionalCup: 60, interregional: 80, allRussian: 120, russia: 160 },
  { place: "6 место", regional: 30, regionalCup: 45, interregional: 60, allRussian: 90, russia: 120 },
  { place: "7 место", regional: 25, regionalCup: 40, interregional: 50, allRussian: 75, russia: 100 },
  { place: "8 место", regional: 20, regionalCup: 30, interregional: 40, allRussian: 60, russia: 80 },
  { place: "9 место", regional: 15, regionalCup: 25, interregional: 30, allRussian: 45, russia: 60 },
  { place: "10 место", regional: 10, regionalCup: 15, interregional: 20, allRussian: 30, russia: 40 },
  { place: "11 место и ниже", regional: 0, regionalCup: 0, interregional: 0, allRussian: 0, russia: 0 },
]

const qualificationRows = [
  ["Заслуженный мастер спорта России (ЗМС)", 1600],
  [
    "Мастер спорта России международного класса (МСМК): Гроссмейстер России",
    1200,
  ],
  ["Мастер спорта России (МС)", 800],
  ["Кандидат в мастера спорта России (КМС)", 500],
  ["1-й спортивный разряд", 300],
  ["2-й спортивный разряд", 200],
  ["3-й спортивный разряд", 150],
  ["1-й юношеский разряд", 100],
  ["2-й юношеский разряд", 75],
  ["3-й юношеский разряд", 50],
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
                <span>Региональное</span>
                <span>Чемпионат / Кубок региона</span>
                <span>Межрегиональное</span>
                <span>Всероссийское</span>
                <span>Чемпионат / Кубок России</span>
              </div>

              {competitionRatingRows.map((row) => (
                <div
                  className="rating-info-competition-row"
                  key={row.place}
                >
                  <strong>{row.place}</strong>
                  <span>{row.regional}</span>
                  <span>{row.regionalCup}</span>
                  <span>{row.interregional}</span>
                  <span>{row.allRussian}</span>
                  <span>{row.russia}</span>
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
