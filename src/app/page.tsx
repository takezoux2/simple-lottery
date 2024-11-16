
export default function Home() {

  // 確率のテーブル
  const probabilityTable = [
    { label: '当たり', ratio: 0.3 },
    { label: 'はずれ', ratio: 0.7 }
  ];
  const totalRatio = probabilityTable.reduce((acc, cur) => acc + cur.ratio, 0);

  const chooseLottery = () => {
    const random = Math.random();
    let sum = 0;
    for (const { label, ratio } of probabilityTable) {
      sum += ratio / totalRatio;
      if (random < sum) {
        return label;
      }
    }
    return "Error";
  }

  const result = chooseLottery();

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <label className=" text-9xl">{result}</label>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        
      </footer>
    </div>
  );
}
