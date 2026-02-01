// ==========================================
// 1. 게임 설정 (여기서 디자인과 난이도를 바꿔요)
// ==========================================
const config = {
    version: "v0.1.3",
    // 길 설정
    pathColor: "#f1c40f",
    pathY: 200,            // 길의 높이 위치
    pathHeight: 100,       // 길의 두께

    // 타워 설정
    towerColor: "#3498db",
    towerSize: 40,
    towerRange: 100,       // 공격 사정거리 (150에서 100으로 축소)
    fireRate: 800,         // 발사 속도 (밀리초, 작을수록 빠름)
    maxTowers: 5,          // 시작 시 세울 수 있는 최대 타워 수
    towerCost: 50,         // 타워 생성 비용

    // 적 설정
    enemyColor: "#e74c3c",
    enemySize: 30,
    enemySpeed: 1.5,       // 적이 움직이는 속도

    // 총알 설정
    bulletColor: "#2ecc71",
    bulletSize: 8,
    bulletSpeed: 6,

    // 성 설정
    castleColor: "#7f8c8d",
    castleHP: 10,          // 성의 에너지
    castleWidth: 70,
    castleUpgradeCost: 100 // 성 업그레이드 비용
};

// ==========================================
// 2. 게임 상태 데이터
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let towers = [];
let enemies = [];
let bullets = [];
let currentCastleHP = config.castleHP;
let isGameOver = false;
let isVictory = false;

// 추가된 상태
let energy = 100;
let energyRate = 10; // 초당 에너지 생산량
let currentWave = 1;
let enemiesToSpawn = 0;
let castleLevel = 1;
let lastEnergyUpdate = Date.now();
let isWaveInProgress = false;

// ==========================================
// 3. 주요 기능 함수들
// ==========================================

// 웨이브 시작
function startWave() {
    if (isGameOver) return;
    isWaveInProgress = true;
    enemiesToSpawn = 5 + (currentWave * 2); // 웨이브마다 적의 수가 늘어남
    const spawnInterval = setInterval(() => {
        if (enemiesToSpawn > 0 && !isGameOver) {
            spawnEnemy();
            enemiesToSpawn--;
        } else {
            clearInterval(spawnInterval);
        }
    }, 1000);
}

// 적 만들기
function spawnEnemy() {
    if (isGameOver) return;
    enemies.push({
        x: 0,
        y: config.pathY + (config.pathHeight / 2) - (config.enemySize / 2),
        hp: 3 + (currentWave * 2), // 웨이브마다 적의 체력 증가
        reward: 10 // 적 처치 시 주는 에너지 (선택 사항)
    });
}
// setInterval(spawnEnemy, 2000); // 이전의 무한 생성은 제거
setTimeout(startWave, 2000); // 2초 후 첫 웨이브 시작

// 타워 공격 로직
function towerAttack() {
    const now = Date.now();
    towers.forEach(tower => {
        if (!tower.lastShot || now - tower.lastShot > config.fireRate) {
            // 사거리 안에 있는 첫 번째 적 찾기
            for (let enemy of enemies) {
                const dx = (tower.x + config.towerSize/2) - (enemy.x + config.enemySize/2);
                const dy = (tower.y + config.towerSize/2) - (enemy.y + config.enemySize/2);
                const dist = Math.sqrt(dx * dx + dy * dy);

                // 업그레이드할수록 사거리 약간 증가 (선택 사항)
                const range = config.towerRange + (tower.level - 1) * 20;

                if (dist < range) {
                    bullets.push({
                        x: tower.x + config.towerSize/2,
                        y: tower.y + config.towerSize/2,
                        target: enemy,
                        damage: 1 + (tower.level - 1) // 레벨에 따라 공격력 증가
                    });
                    tower.lastShot = now;
                    break; 
                }
            }
        }
    });
}

// 총알 이동 및 충돌 체크
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        const dx = b.target.x + config.enemySize/2 - b.x;
        const dy = b.target.y + config.enemySize/2 - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) { // 적에게 맞았을 때
            b.target.hp -= b.damage || 1;
            bullets.splice(i, 1);
            continue;
        }

        b.x += (dx / dist) * config.bulletSpeed;
        b.y += (dy / dist) * config.bulletSpeed;

        // 총알 그리기
        ctx.fillStyle = config.bulletColor;
        ctx.beginPath();
        ctx.arc(b.x, b.y, config.bulletSize/2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 에너지 및 웨이브 업데이트
function updateEnergy() {
    if (isGameOver) return;
    const now = Date.now();
    if (now - lastEnergyUpdate > 1000) {
        energy += energyRate;
        lastEnergyUpdate = now;
    }
}

function checkWaveCompletion() {
    if (isWaveInProgress && enemies.length === 0 && enemiesToSpawn === 0 && !isGameOver) {
        if (currentWave === 10) {
            isVictory = true;
            return;
        }
        isWaveInProgress = false;
        currentWave++;
        config.maxTowers += 1; // 웨이브마다 타워 제한 1개씩 증가 (2에서 1로 줄임)
        // 다음 웨이브까지 3초 휴식 시간
        setTimeout(startWave, 3000);
    }
}

// 적 이동 및 성 충돌 체크
function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        enemy.x += config.enemySpeed;

        // 죽은 적 제거
        if (enemy.hp <= 0) {
            energy += enemy.reward; // 적 처치 시 보상
            enemies.splice(i, 1);
            continue;
        }

        // 성에 닿았을 때
        if (enemy.x > canvas.width - config.castleWidth) {
            currentCastleHP -= 1;
            enemies.splice(i, 1);
            if (currentCastleHP <= 0) isGameOver = true;
            continue;
        }

        // 적 그리기
        ctx.fillStyle = config.enemyColor;
        ctx.fillRect(enemy.x, enemy.y, config.enemySize, config.enemySize);
    }
    
    checkWaveCompletion();
}

// 타워 그리기
function drawTowers() {
    towers.forEach(tower => {
        ctx.fillStyle = config.towerColor;
        ctx.fillRect(tower.x, tower.y, config.towerSize, config.towerSize);
        
        // 레벨 및 업그레이드 비용 표시
        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.fillText(`Lv.${tower.level}`, tower.x + 5, tower.y + 15);
        ctx.font = "10px Arial";
        ctx.fillText(`$${tower.level * 30}`, tower.x + 5, tower.y + 30);

        // 사정거리 표시
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.beginPath();
        const range = config.towerRange + (tower.level - 1) * 20;
        ctx.arc(tower.x + config.towerSize/2, tower.y + config.towerSize/2, range, 0, Math.PI*2);
        ctx.stroke();
    });
}

// 성 그리기
function drawCastle() {
    ctx.fillStyle = config.castleColor;
    ctx.fillRect(canvas.width - config.castleWidth, config.pathY - 20, config.castleWidth, config.pathHeight + 40);
    
    // 성 HP 및 레벨 표시
    ctx.fillStyle = "white";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`🏰 성 HP: ${currentCastleHP}`, canvas.width - 10, config.pathY - 50);
    ctx.fillText(`Lv.${castleLevel} 성`, canvas.width - 10, config.pathY - 30);
    ctx.textAlign = "left";
}

// UI (수량 및 메시지) 그리기
function drawUI() {
    ctx.fillStyle = "#2c3e50";
    ctx.font = "bold 20px Arial";
    ctx.fillText(`⚡ 에너지: ${Math.floor(energy)} (+$${energyRate}/s)`, 20, 40);
    ctx.fillText(`🌊 웨이브: ${currentWave} (남은 적: ${enemiesToSpawn + enemies.length})`, 20, 70);
    ctx.fillText(`🏹 타워: ${towers.length} / ${config.maxTowers}`, 20, 100);

    ctx.font = "14px Arial";
    ctx.fillText(`[성 클릭] 업그레이드 ($${config.castleUpgradeCost})`, 20, canvas.height - 40);
    ctx.fillText(`[빈곳 클릭] 타워 건설 ($${config.towerCost})`, 20, canvas.height - 20);

    // 버전 표시
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "12px Arial";
    ctx.textAlign = "right";
    ctx.fillText(config.version, canvas.width - 10, canvas.height - 10);
    ctx.textAlign = "left";

    if (isVictory) {
        ctx.fillStyle = "rgba(46, 204, 113, 0.9)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "bold 50px Arial";
        ctx.fillText("🎉 미션 성공! 🎉", canvas.width/2, canvas.height/2);
        ctx.font = "20px Arial";
        ctx.fillText("당신은 완벽하게 성을 지켜냈습니다!", canvas.width/2, canvas.height/2 + 50);
        return;
    }

    if (isGameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "bold 40px Arial";
        ctx.fillText("🏰 성이 무너졌습니다!", canvas.width/2, canvas.height/2);
        ctx.font = "20px Arial";
        ctx.fillText(`최종 웨이브: ${currentWave}`, canvas.width/2, canvas.height/2 + 40);
        ctx.fillText("새로고침(F5)으로 다시 도전하세요!", canvas.width/2, canvas.height/2 + 80);
    }
}

// ==========================================
// 4. 마우스 클릭 이벤트
// ==========================================
canvas.addEventListener('mousedown', (e) => {
    if (isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 1. 성 업그레이드 체크
    if (mouseX > canvas.width - config.castleWidth) {
        if (energy >= config.castleUpgradeCost) {
            energy -= config.castleUpgradeCost;
            castleLevel++;
            currentCastleHP++; // 성 업그레이드 시 HP 1 증가 보상
            energyRate += 5; // 레벨당 에너지 생산량 증가
            return;
        }
    }

    // 2. 기존 타워 업그레이드 체크
    for (let tower of towers) {
        if (mouseX > tower.x && mouseX < tower.x + config.towerSize &&
            mouseY > tower.y && mouseY < tower.y + config.towerSize) {
            
            const upgradeCost = tower.level * 30; // 레벨에 따른 업그레이드 비용
            if (energy >= upgradeCost) {
                energy -= upgradeCost;
                tower.level++;
            }
            return;
        }
    }

    // 3. 타워 건설 체크
    // 길 위에는 설치 불가
    if (mouseY > config.pathY && mouseY < config.pathY + config.pathHeight) {
        return;
    }

    // 에너지 및 타워 개수 제한
    if (towers.length < config.maxTowers && energy >= config.towerCost) {
        energy -= config.towerCost;
        towers.push({
            x: mouseX - config.towerSize/2,
            y: mouseY - config.towerSize/2,
            lastShot: 0,
            level: 1
        });
    }
});

// ==========================================
// 5. 메인 루프 (무한 반복)
// ==========================================
function update() {
    if (isGameOver || isVictory) {
        drawUI();
        return;
    }

    // 1. 화면 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. 배경 길 그리기
    ctx.fillStyle = config.pathColor;
    ctx.fillRect(0, config.pathY, canvas.width, config.pathHeight);

    // 3. 각 요소 업데이트 및 그리기
    updateEnergy();
    drawCastle();
    towerAttack();
    updateEnemies();
    updateBullets();
    drawTowers();
    drawUI();

    requestAnimationFrame(update);
}

// 게임 시작!
update();