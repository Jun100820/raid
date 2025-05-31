document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const targetLevelSelect = document.getElementById('target-level');
    const enableFormeChangeCheckbox = document.getElementById('enable-forme-change');
    const formeChangeInputsDiv = document.getElementById('forme-change-inputs');
    const formeChangeCandyInput = document.getElementById('forme-change-candy');
    const formeChangeEnergyInput = document.getElementById('forme-change-energy');

    const environmentsContainer = document.getElementById('environments-container');
    const addEnvironmentButton = document.getElementById('add-environment-button');
    const simulateButton = document.getElementById('simulate-button');

    const resultsArea = document.getElementById('results-area');
    const overallSummaryDiv = document.getElementById('overall-summary');
    const environmentResultsContainer = document.getElementById('environment-results-container');
    const errorMessageDiv = document.getElementById('error-message');

    // --- 必須要素の存在チェック ---
    if (!environmentsContainer) {
        console.error("致命的エラー: ID 'environments-container' を持つ要素が見つかりません。環境設定機能は動作しません。HTMLのIDを確認してください。");
        showError("ページ初期化エラー: 環境設定エリアを読み込めません。");
        return; // 処理を中断
    }
    if (!addEnvironmentButton) {
        console.error("致命的エラー: ID 'add-environment-button' を持つ要素が見つかりません。環境追加ボタンは動作しません。HTMLのIDを確認してください。");
        showError("ページ初期化エラー: 環境追加ボタンを読み込めません。");
        return; // 処理を中断
    }
    if (!targetLevelSelect || !enableFormeChangeCheckbox || !formeChangeInputsDiv || !formeChangeCandyInput || !formeChangeEnergyInput || !simulateButton || !resultsArea || !overallSummaryDiv || !environmentResultsContainer || !errorMessageDiv) {
        console.warn("警告: 一部のUI要素が見つかりませんでした。機能に影響がある可能性があります。HTMLのIDを確認してください。");
        // 致命的ではないかもしれないので、処理は続行するが警告を出す
    }
    // --- 必須要素の存在チェックここまで ---

    let environmentCount = 0;

    // 初期状態設定
    addEnvironmentBlock(); // 最初に1つの環境設定ブロックを追加

    // イベントリスナー
    if (enableFormeChangeCheckbox) {
        enableFormeChangeCheckbox.addEventListener('change', () => {
            if (formeChangeInputsDiv) {
                formeChangeInputsDiv.classList.toggle('hidden', !enableFormeChangeCheckbox.checked);
            }
            if (!enableFormeChangeCheckbox.checked && formeChangeCandyInput && formeChangeEnergyInput) {
                formeChangeCandyInput.value = '';
                formeChangeEnergyInput.value = '';
            }
        });
    }

    addEnvironmentButton.addEventListener('click', addEnvironmentBlock); // environmentsContainerは上でチェック済み

    if (simulateButton) {
        simulateButton.addEventListener('click', runSimulation);
    }


    /**
     * 環境設定ブロックを動的に追加する関数
     */
    function addEnvironmentBlock() {
        // environmentsContainer は関数の外で存在チェック済みなので、ここでは不要
        environmentCount++;
        const envId = environmentCount;

        const div = document.createElement('div');
        div.classList.add('environment-block');
        div.dataset.envId = envId;
        // 削除ボタンには type="button" を追加して、フォーム送信を防ぐ（今回はフォームではないが作法として）
        div.innerHTML = `
            <h3>環境 ${envId}</h3>
            ${envId > 1 ? '<button type="button" class="button-remove remove-environment-button">削除</button>' : ''}
            <div class="form-group">
                <label for="base-candy-${envId}">基本の飴/レイド:</label>
                <input type="number" id="base-candy-${envId}" class="base-candy" min="0" placeholder="例: 3" required>
            </div>
            <div class="form-group">
                <label for="base-xl-candy-${envId}">基本のXL飴/レイド:</label>
                <input type="number" id="base-xl-candy-${envId}" class="base-xl-candy" min="0" placeholder="例: 1">
            </div>
            <div class="form-group">
                <input type="checkbox" id="mega-bonus-${envId}" class="mega-bonus">
                <label for="mega-bonus-${envId}">メガシンカボーナス適用 (+1飴)</label>
            </div>
            <div class="form-group">
                <input type="checkbox" id="energy-drop-${envId}" class="energy-drop">
                <label for="energy-drop-${envId}">エナジードロップ有り (平均125)</label>
            </div>
        `;
        environmentsContainer.appendChild(div);

        // 削除ボタンのイベントリスナー設定 (envId > 1 の場合のみ)
        // ボタンはinnerHTMLで生成された後にquerySelectorで取得する
        const removeButton = div.querySelector('.remove-environment-button');
        if (removeButton) { // ボタンがHTMLに存在する場合のみ（つまり envId > 1 の場合）
            removeButton.addEventListener('click', () => {
                div.remove();
                // 必要であれば、ここで environmentCount をデクリメントしたり、
                // 他の環境ブロックの番号を振り直したりする処理を追加できますが、
                // 今回の仕様では削除のみでOKです。
            });
        }
    }

    /**
     * シミュレーションを実行する関数
     */
    function runSimulation() {
        clearResultsAndErrors();
        let isValid = true;

        // 1. 入力値の取得とバリデーション (目標設定)
        const targetLevel = parseInt(targetLevelSelect.value);
        const isFormeChangeEnabled = enableFormeChangeCheckbox.checked;
        let formeChangeCandy = 0;
        let formeChangeEnergy = 0;

        if (isFormeChangeEnabled) {
            formeChangeCandy = parseInt(formeChangeCandyInput.value) || 0;
            formeChangeEnergy = parseInt(formeChangeEnergyInput.value) || 0;

            if (formeChangeCandyInput.value && formeChangeCandy < 0) { // 入力があって負の場合
                showError("フォルムチェンジの飴は0以上の数値を入力してください。");
                isValid = false;
            }
            if (formeChangeEnergyInput.value && formeChangeEnergy < 0) { // 入力があって負の場合
                showError("フォルムチェンジのエナジーは0以上の数値を入力してください。");
                isValid = false;
            }
        }
        if (!isValid) return;


        // 2. 目標リソース量の計算
        let targetTotalCandy = 0;
        if (targetLevel === 40) targetTotalCandy = 248;
        if (targetLevel === 50) targetTotalCandy = 248;
        targetTotalCandy += formeChangeCandy;

        const targetTotalXLCandy = (targetLevel === 50) ? 296 : 0;
        const targetTotalEnergy = formeChangeEnergy;

        // 3. 各環境設定の取得とバリデーション
        const environmentBlocks = environmentsContainer.querySelectorAll('.environment-block');
        if (environmentBlocks.length === 0) {
            showError("最低1つの環境設定を行ってください。");
            return;
        }

        const environmentsData = [];
        for (let i = 0; i < environmentBlocks.length; i++) {
            const block = environmentBlocks[i];
            const envId = block.dataset.envId;

            const baseCandyInput = block.querySelector(`#base-candy-${envId}`);
            const baseXLCandyInput = block.querySelector(`#base-xl-candy-${envId}`);

            if (!baseCandyInput) { // 要素が見つからない場合のガード
                showError(`環境 ${envId}: 飴の入力欄が見つかりません。`);
                isValid = false; break;
            }

            const baseCandy = parseInt(baseCandyInput.value);
            const baseXLCandy = baseXLCandyInput ? (parseInt(baseXLCandyInput.value) || 0) : 0;

            if (isNaN(baseCandy) || baseCandy < 0) {
                showError(`環境 ${envId}: 基本の飴/レイドには0以上の数値を入力してください。`);
                if (baseCandyInput) baseCandyInput.focus();
                isValid = false;
                break;
            }
            if (baseXLCandyInput && baseXLCandyInput.value && baseXLCandy < 0) {
                 showError(`環境 ${envId}: 基本のXL飴/レイドには0以上の数値を入力してください。`);
                 if (baseXLCandyInput) baseXLCandyInput.focus();
                 isValid = false;
                 break;
            }

            const megaBonusCheckbox = block.querySelector(`#mega-bonus-${envId}`);
            const energyDropCheckbox = block.querySelector(`#energy-drop-${envId}`);

            environmentsData.push({
                id: envId,
                baseCandy: baseCandy,
                baseXLCandy: baseXLCandy,
                megaBonus: megaBonusCheckbox ? megaBonusCheckbox.checked : false,
                energyDrop: energyDropCheckbox ? energyDropCheckbox.checked : false,
            });
        }

        if (!isValid) return;

        // 4. 各環境ごとのレイド回数計算と結果表示
        if(resultsArea) resultsArea.classList.remove('hidden');
        let overallSummaryText = "総合予測: ";
        let firstEnv = true;

        environmentsData.forEach((env) => { // indexは不要なら削除
            const effectiveCandyPerRaid = env.baseCandy + (env.megaBonus ? 1 : 0);
            const averageEnergyPerRaid = 125;

            let raidsForCandy = 0;
            if (targetTotalCandy > 0) {
                if (effectiveCandyPerRaid > 0) {
                    raidsForCandy = Math.ceil(targetTotalCandy / effectiveCandyPerRaid);
                } else {
                    raidsForCandy = Infinity;
                }
            }

            let raidsForXLCandy = 0;
            if (targetTotalXLCandy > 0) {
                if (env.baseXLCandy > 0) {
                    raidsForXLCandy = Math.ceil(targetTotalXLCandy / env.baseXLCandy);
                } else {
                    raidsForXLCandy = Infinity;
                }
            }

            let raidsForEnergy = 0;
            if (targetTotalEnergy > 0) {
                if (env.energyDrop) {
                    if (averageEnergyPerRaid > 0) {
                         raidsForEnergy = Math.ceil(targetTotalEnergy / averageEnergyPerRaid);
                    } else {
                        raidsForEnergy = Infinity;
                    }
                } else {
                    raidsForEnergy = Infinity;
                }
            }

            const totalRaidsRequired = Math.max(raidsForCandy, raidsForXLCandy, raidsForEnergy);

            displayEnvironmentResult(env, totalRaidsRequired, {
                targetTotalCandy, targetTotalXLCandy, targetTotalEnergy,
                effectiveCandyPerRaid, baseXLCandy: env.baseXLCandy, averageEnergyPerRaid,
                raidsForCandy, raidsForXLCandy, raidsForEnergy
            });

            if (!firstEnv) overallSummaryText += ", ";
            overallSummaryText += `環境${env.id}: ${totalRaidsRequired === Infinity ? "達成不可" : totalRaidsRequired + "回"}`;
            firstEnv = false;
        });

        if(overallSummaryDiv) overallSummaryDiv.textContent = overallSummaryText;
    }

    /**
     * 特定の環境の結果を表示する関数
     */
    function displayEnvironmentResult(env, totalRaidsRequired, details) {
        if (!environmentResultsContainer) return;
        const resultBlock = document.createElement('div');
        resultBlock.classList.add('environment-result-block');

        let predictionText = `総合予測: ${totalRaidsRequired === Infinity ? "<strong>達成不可</strong>" : `<strong>${totalRaidsRequired} 回</strong>`}`;

        let detailsHtml = `<p><strong>内訳:</strong></p>`;
        if (details.targetTotalCandy > 0) {
            detailsHtml += `<p>レベルアップ/フォルムチェンジ (飴 ${details.targetTotalCandy}個): ${details.raidsForCandy === Infinity ? "達成不可" : details.raidsForCandy + "回"}</p>`;
        }
        if (details.targetTotalXLCandy > 0) {
            detailsHtml += `<p>レベルアップ (XL飴 ${details.targetTotalXLCandy}個): ${details.raidsForXLCandy === Infinity ? "達成不可" : details.raidsForXLCandy + "回"}</p>`;
        }
        if (details.targetTotalEnergy > 0) {
            detailsHtml += `<p>フォルムチェンジ (エナジー ${details.targetTotalEnergy}集め): ${details.raidsForEnergy === Infinity ? "達成不可" : details.raidsForEnergy + "回"}</p>`;
        }

        detailsHtml += `<p style="margin-top:10px;"><strong>予想リソース収支 (総合予測回数実施時):</strong></p>`;
        if (totalRaidsRequired !== Infinity) {
            const predictedTotalCandy = details.effectiveCandyPerRaid * totalRaidsRequired;
            const remainingCandy = predictedTotalCandy - details.targetTotalCandy;
            detailsHtml += `<p>飴: 獲得 ${predictedTotalCandy}個 / 目標 ${details.targetTotalCandy}個 / 残り ${remainingCandy}個</p>`;

            if (details.targetTotalXLCandy > 0) {
                const predictedTotalXLCandy = details.baseXLCandy * totalRaidsRequired;
                const remainingXLCandy = predictedTotalXLCandy - details.targetTotalXLCandy;
                detailsHtml += `<p>XL飴: 獲得 ${predictedTotalXLCandy}個 / 目標 ${details.targetTotalXLCandy}個 / 残り ${remainingXLCandy}個</p>`;
            }
            if (details.targetTotalEnergy > 0 && env.energyDrop) {
                const predictedTotalEnergy = details.averageEnergyPerRaid * totalRaidsRequired;
                const remainingEnergy = predictedTotalEnergy - details.targetTotalEnergy;
                detailsHtml += `<p>エナジー: 獲得 ${predictedTotalEnergy}個 / 目標 ${details.targetTotalEnergy}個 / 残り ${remainingEnergy}個</p>`;
            }
        } else {
            detailsHtml += `<p>飴: - / 目標 ${details.targetTotalCandy}個 / 残り -</p>`;
            if (details.targetTotalXLCandy > 0) {
                 detailsHtml += `<p>XL飴: - / 目標 ${details.targetTotalXLCandy}個 / 残り -</p>`;
            }
            if (details.targetTotalEnergy > 0) {
                 detailsHtml += `<p>エナジー: - / 目標 ${details.targetTotalEnergy}個 / 残り -</p>`;
            }
        }

        let notesText = "";
        if (env.energyDrop && details.targetTotalEnergy > 0) {
            notesText += "エナジードロップ有りの場合、1レイドあたりのエナジー獲得量は80～170で変動するため、実際の回数は前後する可能性があります。このシミュレーションでは平均値(125)を使用しています。<br>";
        }
        if (totalRaidsRequired === Infinity) {
            notesText += "いずれかの必要アイテムの獲得数が0の場合や、目標に対してドロップがない設定の場合、そのアイテムをレイドで集めることはできず、「達成不可」と表示されます。";
        }

        resultBlock.innerHTML = `
            <h3>環境 ${env.id} の結果</h3>
            <div class="summary">
                <p>設定: 基本飴/レイド: ${env.baseCandy} | メガシンカ: ${env.megaBonus ? "有 (+1)" : "無"} (実効 ${details.effectiveCandyPerRaid}個) | XL飴/レイド: ${env.baseXLCandy} | エナジードロップ: ${env.energyDrop ? "有" : "無"}</p>
            </div>
            <div class="prediction">${predictionText}</div>
            <div class="details">
                <span class="details-toggle">▼ 詳細を表示</span>
                <div class="details-content hidden">
                    ${detailsHtml}
                </div>
            </div>
            ${notesText ? `<div class="notes">${notesText}</div>` : ""}
        `;
        environmentResultsContainer.appendChild(resultBlock);

        const toggle = resultBlock.querySelector('.details-toggle');
        const content = resultBlock.querySelector('.details-content');
        if (toggle && content) {
            toggle.addEventListener('click', () => {
                content.classList.toggle('hidden');
                toggle.textContent = content.classList.contains('hidden') ? '▼ 詳細を表示' : '▲ 詳細を隠す';
            });
        }
    }

    /**
     * 結果表示とエラーメッセージをクリアする関数
     */
    function clearResultsAndErrors() {
        if(overallSummaryDiv) overallSummaryDiv.textContent = '';
        if(environmentResultsContainer) environmentResultsContainer.innerHTML = '';
        if(errorMessageDiv) {
            errorMessageDiv.textContent = '';
            errorMessageDiv.classList.add('hidden');
        }
        if(resultsArea) resultsArea.classList.add('hidden');
    }

    /**
     * エラーメッセージを表示する関数
     */
    function showError(message) {
        if (errorMessageDiv) {
            errorMessageDiv.textContent = message;
            errorMessageDiv.classList.remove('hidden');
        }
        if (resultsArea) { // エラーメッセージエリア自体を表示するために結果エリアも表示
            resultsArea.classList.remove('hidden');
        }
         // エラー発生時は、結果のサマリーや詳細結果はクリアしておく
        if(overallSummaryDiv) overallSummaryDiv.textContent = '';
        if(environmentResultsContainer) environmentResultsContainer.innerHTML = '';
    }
});


