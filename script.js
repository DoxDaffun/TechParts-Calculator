console.log("【DEBUG】script.js が読み込まれました");
// script.js

// ────────────────────────────────────────────
// ——— 各ターゲット値の定義 ——————————
// ────────────────────────────────────────────
const TARGETS = [900, 1200, 1650, 2100, 2550, 3000, 4500];

// ────────────────────────────────────────────
// ——— グローバル変数 ———————————————
// ────────────────────────────────────────────
let lookupTable = []; // JSON読み込み後、全レコードがここに入る


/**
 * ページ読み込み時に実行される処理
 * - lookup.json を fetch して JSON を読み込む
 * - ボタンにクリックイベントを登録する
 */
document.addEventListener("DOMContentLoaded", () => {
  // 1) lookup.json を読み込む
  fetch("lookup.json")
    .then(response => {
      if (!response.ok) {
        throw new Error("lookup.json の読み込みに失敗しました（HTTP " + response.status + "）");
      }
      return response.json();
    })
    .then(jsonData => {
      lookupTable = jsonData; // [{ Const1:"E",Const2:"E",Const3:"E", Chip:0, Multiplier:1.0, Total:3000.0 }, ...]
      console.log("lookupTable の読み込み完了。件数:", lookupTable.length);
    })
    .catch(err => {
      console.error(err);
      alert("エラー：lookup.json の読み込みに失敗しました。\n詳細はコンソールを確認してください。");
    });

  // 2) Calculate ボタンにイベントリスナーを登録
  const calculateBtn = document.getElementById("calculate-btn");
  calculateBtn.addEventListener("click", onClickCalculate);
});


/**
 * Calculate ボタン押下時のメイン処理
 */
function onClickCalculate() {
  console.log("【DEBUG】onClickCalculate が呼ばれました");
  // 1) 各パーツ所持数とチップ数を取得
  const counts = {
    E: parseInt(document.getElementById("count-E").value, 10) || 0,
    L0: parseInt(document.getElementById("count-L0").value, 10) || 0,
    L1: parseInt(document.getElementById("count-L1").value, 10) || 0,
    L2: parseInt(document.getElementById("count-L2").value, 10) || 0,
    L3: parseInt(document.getElementById("count-L3").value, 10) || 0,
    L4: parseInt(document.getElementById("count-L4").value, 10) || 0,
    // Y は入力値として使わない仕様
    // Y: parseInt(document.getElementById("count-Y").value, 10) || 0,
    chip: parseInt(document.getElementById("count-chip").value, 10) || 0
  };

  // 2) 部品の合計数を算出
  const totalPartsCount = counts.E + counts.L0 + counts.L1 + counts.L2 + counts.L3 + counts.L4;
  // （Y は計算に使わないためカウントに含まない）

  // 3) 出力エリアをクリア
  const resultArea = document.getElementById("result-area");
  resultArea.innerHTML = "";

  // 4) partsCount の大小で分岐
  if (totalPartsCount < 6) {
    // ＜6 の場合
    handleLessThanSix(counts, totalPartsCount);
  } else {
    // 6以上の場合
    handleGreaterEqualSix(counts, totalPartsCount);
  }
}


/**
 * 「合計部品数 < 6」の場合の処理
 * 要件：Targetにかかわらず、Drone >= Soccer となるような **１つのパターン** を出力
 *
 * ここでは簡便のため
 * - Drone に "先頭から３つ" の部品（存在するなら）とチップ総数を全部割り当て
 * - Soccer は空（Total=0） として出力
 */
function handleLessThanSix(counts, totalPartsCount) {
  const resultArea = document.getElementById("result-area");

  // 1) 所持している部品リストを作成（重複あり配列）
  const partPool = [];
  for (let part of ["E", "L0", "L1", "L2", "L3", "L4"]) {
    for (let i = 0; i < counts[part]; i++) {
      partPool.push(part);
    }
  }
  if (partPool.length < 3) {
    // ３つの部品すら選べない場合、エラーとして返す
    const errDiv = document.createElement("div");
    errDiv.style.color = "red";
    errDiv.textContent = "エラー：入力された部品数が3つに満たないため、Drone のみの計算ができません。";
    resultArea.appendChild(errDiv);
    return;
  }

  // 2) 先頭から3つを取り出して Drone パーツ３つとする
  const droneParts = partPool.slice(0, 3);
  // 3) Drone に全チップ: counts.chip を割り当てる
  const droneChip = counts.chip;
  // 4) Drone の Total を lookupTable から探す
  const droneTotal = lookupTotalForCombination(droneParts, droneChip);

  // 5) Soccer は常に Total=0 (部品なし or チップなし)
  const soccerParts = []; // 空配列
  const soccerChip = 0;
  const soccerTotal = 0;

  // 6) 表示用に HTML を構築
  const container = document.createElement("div");
  container.classList.add("result-item");

  // Drone 表示
  const droneHeader = document.createElement("div");
  droneHeader.classList.add("result-header");
  droneHeader.textContent = "★ Drone のパターン";
  container.appendChild(droneHeader);

  const droneContent = document.createElement("div");
  droneContent.classList.add("result-content");
  droneContent.innerHTML = `
    - パーツ: ${droneParts.join(", ")}<br/>
    - Chip: ${droneChip}<br/>
    - Total: ${droneTotal !== null ? droneTotal : "該当なし"}<br/>
  `;
  container.appendChild(droneContent);

  // Soccer 表示
  const soccerHeader = document.createElement("div");
  soccerHeader.classList.add("result-header");
  soccerHeader.textContent = "★ Soccer のパターン";
  container.appendChild(soccerHeader);

  const soccerContent = document.createElement("div");
  soccerContent.classList.add("result-content");
  soccerContent.innerHTML = `
    - パーツ: （なし）<br/>
    - Chip: 0<br/>
    - Total: 0<br/>
  `;
  container.appendChild(soccerContent);

  resultArea.appendChild(container);
}


/**
 * 「合計部品数 >= 6」の場合の処理
 * 要件：与えられた入力の中から満たしうる Target の中で
 *       Drone, Soccer 両方の Total を **最小** にする、
 *       かつ Drone >= Soccer となる **すべてのパターン** を出力。
 *
 * 1) partPool から部品を重複なしで3つずつ取り出す全組み合わせを作成（重複ありの部品数管理で）。
 * 2) チップは 0〜 counts.chip の間で分割 (droneChip + soccerChip = counts.chip) をすべて試す。
 * 3) 各組み合わせごとに lookupTable から Total を算出 (const1, const2, const3, chip で検索)。
 * 4) DroneTotal >= SoccerTotal のものだけを残す。
 * 5) それぞれの Total を「TARGETS のいずれか以上を満たす最低値」で評価し、最小化してフィルターする。
 * 6) 最終的に複数パターンがあれば、すべて表示する。
 *
 * ※ 本実装では「TARGETS を満たす」とは、Total >= targetMin の意味とし、
 *    それぞれ最も近い targetMin を求めます。もし targetMin を超えなかった場合、
 *    その組み合わせは「対象外」として扱います。
 */
function handleGreaterEqualSix(counts, totalPartsCount) {
  const resultArea = document.getElementById("result-area");

  // 1) 部品プールを「重複ありの配列」として用意
  const partPool = [];
  for (let part of ["E", "L0", "L1", "L2", "L3", "L4"]) {
    for (let i = 0; i < counts[part]; i++) {
      partPool.push(part);
    }
  }

  console.log("【DEBUG】partPool:", partPool, "length=", partPool.length);

  // 2) すべての「3つの部品組み合わせペア」を列挙
  //    - Drone側3つを選ぶ → 残りからSoccer側3つを選ぶ
  //    - 部品数管理が必要（順序ではなく、カウントで重複を扱う）
  const allPairs = generateAllPartTripletPairs(partPool);
  // allPairs 例: [ { droneParts: ["E","L1","L1"], soccerParts: ["L0","L2","L3"] }, ... ]
  //console.log("【DEBUG】generateAllPartTripletPairs 後の allPairs.length =", allPairs.length);
  // 先頭 10 件だけサンプル表示
  //console.log("【DEBUG】allPairs sample:", allPairs.slice(0, 10));
  console.log("【DEBUG】全ペア数:", allPairs.length, allPairs.slice(0, 5)); // 先頭5件だけ表示

  const testDrone = ["L0", "L0", "L0"];
  const testSoccer = ["L1", "L1", "L1"];
  const testDroneTotal = lookupTotalForCombination(testDrone, 20);
  const testSoccerTotal = lookupTotalForCombination(testSoccer, 0);
  console.log(
    "【DEBUG】テスト lookup:",
    testDrone, 20, "→ dTotal =", testDroneTotal,
    "|", testSoccer, 0, "→ sTotal =", testSoccerTotal
  );

  if (allPairs.length === 0) {
    const msg = document.createElement("div");
    msg.style.color = "red";
    msg.textContent = "エラー：部品が 6つ以上あるにも関わらず、3つずつ分割できる組み合わせが見つかりません。";
    resultArea.appendChild(msg);
    return;
  }

  // 3) チップの分割パターン (0〜chipTotal) すべてを用意
  const chipTotal = counts.chip;
  const chipSplits = [];
  for (let d = 0; d <= chipTotal; d++) {
    chipSplits.push({ droneChip: d, soccerChip: chipTotal - d });
  }
  console.log("【DEBUG】chipSplits（分割パターン）:", chipSplits);

  // 4) 条件を満たす組み合わせをすべて記録しつつ、一旦配列に入れる
  //    { droneParts, soccerParts, droneChip, soccerChip, droneTotal, soccerTotal, droneTarget, soccerTarget }
  let candidateCount = 0;
  const validCombinations = [];

  for (let pair of allPairs) {
    for (let split of chipSplits) {
      const dTotal = lookupTotalForCombination(pair.droneParts, split.droneChip);
      const sTotal = lookupTotalForCombination(pair.soccerParts, split.soccerChip);
      if (dTotal === null || sTotal === null){
        console.log("【DEBUG】lookup miss:", pair.droneParts, split.droneChip, "→", dTotal, 
                    "|", pair.soccerParts, split.soccerChip, "→", sTotal);
        continue;
      } // ルックアップに該当なし

      if (dTotal < sTotal) {
        console.log(
          "【DEBUG】Drone<Soceker skip／dTotal=", dTotal, "< sTotal=", sTotal,
          "（ペア:", pair.droneParts, split.droneChip, "|", pair.soccerParts, split.soccerChip, "）"
        );
        continue;
      } // Drone >= Soccer の条件を満たさない場合は除外

      // それぞれが TARGETS のいずれかを超えるか検証し、最小の target 値を探す
      const dTarget = smallestTargetGreaterOrEqual(dTotal);
      const sTarget = smallestTargetGreaterOrEqual(sTotal);
      if (dTarget === null || sTarget === null) {
        console.log("【DEBUG】Target miss:", dTotal, "->", dTarget, "|", sTotal, "->", sTarget);
        // どちらかがすべてのTARGETSを満たせない場合は除外
        continue;
      }

      candidateCount++;
      validCombinations.push({
        droneParts: [...pair.droneParts],
        soccerParts: [...pair.soccerParts],
        droneChip: split.droneChip,
        soccerChip: split.soccerChip,
        droneTotal: dTotal,
        soccerTotal: sTotal,
        droneTarget: dTarget,
        soccerTarget: sTarget
      });
    }
  }

  console.log("【DEBUG】最終候補 before filter count =", candidateCount);
  console.log("【DEBUG】validCombinations length =", validCombinations.length);

  if (validCombinations.length === 0) {
    const msg = document.createElement("div");
    msg.style.color = "red";
    msg.textContent = "該当する組み合わせが見つかりませんでした。";
    resultArea.appendChild(msg);
    return;
  }

  // 5) 「DroneTarget と SoccerTarget をそれぞれ最小にする」フィルタリング
  //    まず最小の droneTarget を求め、次にその範囲で最小の soccerTarget を求める
  const allDroneTargets = validCombinations.map(x => x.droneTarget);
  const minDroneTarget = Math.min(...allDroneTargets);

  // minDroneTarget と一致する組み合わせだけ１次フィルター
  const candidates1 = validCombinations.filter(x => x.droneTarget === minDroneTarget);

  // その候補の中から「最小の soccerTarget」を求める
  const allSoccerTargets = candidates1.map(x => x.soccerTarget);
  const minSoccerTarget = Math.min(...allSoccerTargets);

  // 最終的に
  const finalCandidates = candidates1.filter(x => x.soccerTarget === minSoccerTarget);

  // 6) 出力：最終候補をすべて表示
  finalCandidates.forEach((item, idx) => {
    const container = document.createElement("div");
    container.classList.add("result-item");

    // 見出し
    const header = document.createElement("div");
    header.classList.add("result-header");
    header.textContent = `パターン ${idx + 1}`;
    container.appendChild(header);

    // Drone 情報
    const dDiv = document.createElement("div");
    dDiv.innerHTML = `
      <strong>Drone</strong><br/>
      パーツ: ${item.droneParts.join(", ")}<br/>
      Chip: ${item.droneChip}<br/>
      計算された Total: ${item.droneTotal}<br/>
      満たす Target: ${item.droneTarget}
    `;
    container.appendChild(dDiv);

    // Soccer 情報
    const sDiv = document.createElement("div");
    sDiv.style.marginTop = "8px";
    sDiv.innerHTML = `
      <strong>Soccer</strong><br/>
      パーツ: ${item.soccerParts.join(", ")}<br/>
      Chip: ${item.soccerChip}<br/>
      計算された Total: ${item.soccerTotal}<br/>
      満たす Target: ${item.soccerTarget}
    `;
    container.appendChild(sDiv);

    // もしチップの余りがあるなら表示
    const usedChips = item.droneChip + item.soccerChip;
    if (usedChips < counts.chip) {
      const leftover = document.createElement("div");
      leftover.style.marginTop = "8px";
      leftover.textContent = `※ チップの余り: ${counts.chip - usedChips}`;
      container.appendChild(leftover);
    }

    resultArea.appendChild(container);
  });
}


/**
 * partPool (重複ありの配列) から
 * 「Drone用3つのパーツ」「Soccer用3つのパーツ」を取得できるすべての組み合わせを返す
 *
 * 部品数のカウントを管理しつつ、順序を考慮しない「重複あり選び出し」の全組
 *
 * @param {string[]} partPool 重複を含む部品配列 e.g. ["E","L0","L0","L1",...]
 * @return { Array<{droneParts:string[], soccerParts:string[]}> }
 */
function generateAllPartTripletPairs(partPool) {
  // 要件：partPool の要素を「順序を考慮せず」「重複数を考慮」して3つ選択 → 残りから3つ選択
  // アルゴリズムイメージ：
  //   1) partPool をソート
  //   2) 深さ優先で3個を pick → 残りプールを作成 → 残りから3個 pick
  //   3) それぞれを無秩序集合としてユニークに集約

  const results = [];
  const n = partPool.length;
  // ソートして、同じものは隣接させておく
  partPool.sort();

  // 部品プールを利用しやすいように「文字列 → カウント」に変換
  const countMapInit = {}; // e.g. { E:2, L0:3, L1:1, ... }
  for (let p of partPool) {
    countMapInit[p] = (countMapInit[p] || 0) + 1;
  }

  /**
   * 部品カウントmap のクローンを作るヘルパー
   */
  function cloneCountMap(map) {
    return Object.assign({}, map);
  }

  /**
   * 部品カウントmap から (p) を1つ減らす
   * 成功すれば true、残数が0なら map[key] を削除する
   */
  function decrementCount(map, key) {
    if (!map[key]) {
      return false;
    }
    map[key]--;
    if (map[key] <= 0) {
      delete map[key];
    }
    return true;
  }

  /**
   * カウントmap に基づいて「可能な限り重複を考慮しない組み合わせ」で
   * length 個のパーツを選び、全通りを返すヘルパー
   * 
   * @param {Object.<string, number>} countMap 
   * @param {number} length 選択数（ここでは3固定）
   * @returns { string[][] } e.g. [ ["E","L0","L1"], ["E","L1","L1"], ... ]
   */
  function generateCombinationsFromCountMap(countMap, length) {
    const keys = Object.keys(countMap);
    const results = [];
    const combo = [];

    function dfs(startIdx, remaining) {
      if (remaining === 0) {
        results.push(combo.slice());
        return;
      }
      for (let i = startIdx; i < keys.length; i++) {
        const key = keys[i];
        if (!countMap[key]) continue;
        // key を1つ使用
        combo.push(key);
        decrementCount(countMap, key);

        // 同じ key を連続して何回か使う可能性もあるので i をそのまま渡す
        dfs(i, remaining - 1);

        // 戻す
        combo.pop();
        countMap[key] = (countMap[key] || 0) + 1;
      }
    }

    dfs(0, length);
    return results;
  }

  // ────────────────
  // メイン処理開始
  // ────────────────
  // 1) まず Drone用の 3つを選ぶ
  const initialMap = cloneCountMap(countMapInit);
  const droneTriplets = generateCombinationsFromCountMap(initialMap, 3);

  for (let dParts of droneTriplets) {
    // 2) drone 用に選んだ分を消費した残りマップを作る
    const remainingMap = cloneCountMap(countMapInit);
    for (let p of dParts) {
      decrementCount(remainingMap, p);
    }
    // 3) 残りから Soccer 用に3つ選ぶ
    const soccerTriplets = generateCombinationsFromCountMap(remainingMap, 3);
    for (let sParts of soccerTriplets) {
      // 両方とも「順不同」で判定できるよう、ソートしておく
      const droneSorted = dParts.slice().sort();
      const soccerSorted = sParts.slice().sort();
      results.push({
        droneParts: droneSorted,
        soccerParts: soccerSorted
      });
    }
  }

  return results; // 全ペアを返却
}


/**
 * 3つのパーツと chip の組み合わせから lookupTable 内を検索し、Total 値を返す。
 * 見つからなければ null を返す。
 *
 * @param {string[]} parts (長さ3) e.g. ["E","L0","L1"]
 * @param {number} chipCount
 * @returns {number|null}
 */
function lookupTotalForCombination(parts, chipCount) {
  // parts をソートして順序を決定してから検索
  const sortedParts = parts.slice().sort();
  // lookupTable のレコードは Const1, Const2, Const3 がそれぞれ文字列で、
  // 大文字/小文字は一致しているものと仮定
  for (let rec of lookupTable) {
    if (
      rec.Chip === chipCount &&
      rec.Const1 === sortedParts[0] &&
      rec.Const2 === sortedParts[1] &&
      rec.Const3 === sortedParts[2]
    ) {
      return rec.Total;
    }
  }
  return null;
}


/**
 * 与えられた total が TARGETS のいずれかを満たす（>=）とき、
 * その中で最小の値を返す。
 * 満たさない場合は null を返す。
 *
 * @param {number} total
 * @returns {number|null}
 */
function smallestTargetGreaterOrEqual(total) {
  // TARGETS はソート済みと仮定
  for (let t of TARGETS) {
    if (total >= t) {
      return t;
    }
  }
  return null;
}
