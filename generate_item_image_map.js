const fs = require('fs');
const path = require('path');

// 영어 l10n 데이터를 가져와서 모든 장비 이미지와 매핑하는 스크립트
async function generateItemImageMap() {
  try {
    console.log('영어 l10n 데이터 가져오는 중...');
    const response = await fetch('http://localhost:3000/api/bser/l10n/English');
    const data = await response.json();
    const l10n = data.parsedL10n || {};

    console.log(`l10n 데이터 로드 완료: ${Object.keys(l10n).length}개 항목`);

    const itemPath = path.join(__dirname, 'frontend', 'public', 'Item');
    const itemImageMap = {};

    // 이름 정규화 함수
    const normalizeName = (name) => {
      if (!name) return '';
      return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/['"]/g, '')
        .replace(/[&]/g, 'and')
        .replace(/[^\w\s]/g, '');
    };

    // 파일명에서 이름 추출
    const extractNameFromFilename = (filename) => {
      const match = filename.match(/^\d+\.\s*(.+?)\.png$/i);
      if (match) {
        let name = match[1];
        // "_" 이후 부분 제거 (한글 부분)
        const underscoreIndex = name.indexOf('_');
        if (underscoreIndex !== -1) {
          name = name.substring(0, underscoreIndex).trim();
        }
        return name;
      }
      return '';
    };

    // 무기 폴더 처리
    console.log('\n무기 폴더 탐색 중...');
    const weaponsPath = path.join(itemPath, '01. Weapons');
    if (fs.existsSync(weaponsPath)) {
      const weaponDirs = fs.readdirSync(weaponsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      console.log(`무기 타입 폴더: ${weaponDirs.length}개`);

      for (const weaponDir of weaponDirs) {
        const weaponDirPath = path.join(weaponsPath, weaponDir);
        const files = fs.readdirSync(weaponDirPath, { withFileTypes: true })
          .filter(dirent => dirent.isFile() && dirent.name.endsWith('.png'))
          .map(dirent => dirent.name);

        console.log(`  ${weaponDir}: ${files.length}개 파일`);

        for (const file of files) {
          const fileName = extractNameFromFilename(file);
          if (!fileName) continue;

          const normalizedFileName = normalizeName(fileName);
          const relativePath = `/Item/01. Weapons/${weaponDir}/${file}`;

          // l10n에서 매칭되는 아이템 찾기
          for (const [key, value] of Object.entries(l10n)) {
            if (key.startsWith('Item/Name/')) {
              const normalizedL10nName = normalizeName(value);
              if (normalizedL10nName === normalizedFileName) {
                const itemCode = key.replace('Item/Name/', '');
                itemImageMap[itemCode] = relativePath;
                console.log(`    매칭: ${itemCode} -> ${relativePath} (${value})`);
                break;
              }
            }
          }
        }
      }
    }

    // 방어구 폴더 처리
    console.log('\n방어구 폴더 탐색 중...');
    const armorTypes = [
      { type: 'chest', path: path.join(itemPath, '02. Armor', '01. Chest') },
      { type: 'head', path: path.join(itemPath, '02. Armor', '02. Head') },
      { type: 'arm', path: path.join(itemPath, '02. Armor', '03. Arm, Accessory') },
      { type: 'leg', path: path.join(itemPath, '02. Armor', '04. Leg') },
    ];

    for (const { type, path: armorPath } of armorTypes) {
      if (fs.existsSync(armorPath)) {
        const files = fs.readdirSync(armorPath, { withFileTypes: true })
          .filter(dirent => dirent.isFile() && dirent.name.endsWith('.png'))
          .map(dirent => dirent.name);

        console.log(`  ${type}: ${files.length}개 파일`);

        for (const file of files) {
          const fileName = extractNameFromFilename(file);
          if (!fileName) {
            console.log(`    파일명 추출 실패: ${file}`);
            continue;
          }

          const normalizedFileName = normalizeName(fileName);
          let relativePath = '';
          switch (type) {
            case 'chest':
              relativePath = `/Item/02. Armor/01. Chest/${file}`;
              break;
            case 'head':
              relativePath = `/Item/02. Armor/02. Head/${file}`;
              break;
            case 'arm':
              relativePath = `/Item/02. Armor/03. Arm, Accessory/${file}`;
              break;
            case 'leg':
              relativePath = `/Item/02. Armor/04. Leg/${file}`;
              break;
          }

          let matched = false;
          // l10n에서 매칭되는 아이템 찾기
          for (const [key, value] of Object.entries(l10n)) {
            if (key.startsWith('Item/Name/')) {
              const normalizedL10nName = normalizeName(value);
              if (normalizedL10nName === normalizedFileName) {
                const itemCode = key.replace('Item/Name/', '');
                itemImageMap[itemCode] = relativePath;
                console.log(`    매칭: ${itemCode} -> ${relativePath} (${value})`);
                matched = true;
                break;
              }
            }
          }
          
          if (!matched) {
            // 방어구는 항상 로그 출력, 무기는 처음 10개만
            if (type !== 'weapon' || files.indexOf(file) < 10) {
              console.log(`    매칭 실패: ${file} -> "${fileName}" -> normalized: "${normalizedFileName}"`);
            }
          }
        }
      }
    }

    // JSON 파일로 저장
    const outputPath = path.join(__dirname, 'frontend', 'src', 'const', 'itemImageMap.json');
    const sortedMap = {};
    Object.keys(itemImageMap)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach(key => {
        sortedMap[key] = itemImageMap[key];
      });

    fs.writeFileSync(outputPath, JSON.stringify(sortedMap, null, 2), 'utf8');
    
    console.log(`\n✅ 완료! ${Object.keys(sortedMap).length}개 항목이 ${outputPath}에 저장되었습니다.`);
    console.log(`\n매칭되지 않은 파일들:`);
    
    // 매칭되지 않은 파일 확인
    const allMatchedPaths = new Set(Object.values(sortedMap));
    
    // 무기
    const weaponsPath2 = path.join(itemPath, '01. Weapons');
    if (fs.existsSync(weaponsPath2)) {
      const weaponDirs = fs.readdirSync(weaponsPath2, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const weaponDir of weaponDirs) {
        const weaponDirPath = path.join(weaponsPath2, weaponDir);
        const files = fs.readdirSync(weaponDirPath, { withFileTypes: true })
          .filter(dirent => dirent.isFile() && dirent.name.endsWith('.png'))
          .map(dirent => dirent.name);
        
        for (const file of files) {
          const relativePath = `/Item/01. Weapons/${weaponDir}/${file}`;
          if (!allMatchedPaths.has(relativePath)) {
            console.log(`  무기: ${relativePath}`);
          }
        }
      }
    }
    
    // 방어구
    for (const { type, armorPath } of armorTypes) {
      if (fs.existsSync(armorPath)) {
        const files = fs.readdirSync(armorPath, { withFileTypes: true })
          .filter(dirent => dirent.isFile() && dirent.name.endsWith('.png'))
          .map(dirent => dirent.name);
        
        for (const file of files) {
          let relativePath = '';
          switch (type) {
            case 'chest':
              relativePath = `/Item/02. Armor/01. Chest/${file}`;
              break;
            case 'head':
              relativePath = `/Item/02. Armor/02. Head/${file}`;
              break;
            case 'arm':
              relativePath = `/Item/02. Armor/03. Arm, Accessory/${file}`;
              break;
            case 'leg':
              relativePath = `/Item/02. Armor/04. Leg/${file}`;
              break;
          }
          if (!allMatchedPaths.has(relativePath)) {
            console.log(`  ${type}: ${relativePath}`);
          }
        }
      }
    }

  } catch (error) {
    console.error('에러:', error);
  }
}

generateItemImageMap();

