// ------------------------------------ Чтение данных из локального файла ---------------------------------------
function readFile(url) {
    let request = new XMLHttpRequest();
    request.open("GET", url, false);

    request.send(null);
    return request.responseText;
}

// ------------------------------------ Настройка сцены ---------------------------------------

var WIDTH = 1920;
var HEIGHT = 880;

var renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(WIDTH, HEIGHT);
renderer.setClearColor(0x000000, 1);

var myCanvas = renderer.domElement;
myCanvas.setAttribute("id", 'my-canvas');
document.getElementById("myblock").appendChild(myCanvas);

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 10000);
camera.position.set(0, 0, 10);

scene.add(camera);

var light = new THREE.PointLight(0xFFFFFF);
light.position.set(-10, 15, 50);
scene.add(light);


// ------------------------------------ Основные данные молекулы ---------------------------------------
var molecule = new THREE.Object3D();

//массивы для атомов, материалов и геометрий
var atoms = [], materials = [], geometries = [];


//------------------------------------ Таблица с информацией об атомах ---------------------------------------
//atoms['PeriodName'] = [NumberList, Color, Radius, Bonds];
atoms['1'] = [0, 0xFFFFFF, 0.11, 1]; //WHITE H
atoms['6'] = [1, 0x777777, 0.18, 4]; //BLACK C
atoms['7'] = [2, 0x0000ff, 0.15, 3]; //BLUE N
atoms['8'] = [3, 0xFF0000, 0.14, 2]; //RED O
atoms['9'] = [4, 0x9999ff, 0.135, 1]; //LIGHT GREEN F
atoms['15'] = [5, 0xff9900, 0.1, 5]; //ORANGE P
atoms['16'] = [6, 0xffcc33, 0.185, 2]; //YELLOW S
atoms['17'] = [7, 0x00ff00, 0.18, 1]; //GREEN Cl
atoms['25'] = [8, 0xAA0000, 0.193, 1]; //DARK RED BR
atoms['53'] = [9, 0xff00ff, 0.215, 1]; //VIOLET I

//------------------------ Функция для вычисления величины сдвига для двойной и тройной связи ---------------------------
function deltaSearch(bondCount, at1, at2) {
    const minRad = Math.min(atoms[at1][2], atoms[at2][2]);
    return minRad / Math.pow(2, bondCount);
}

//------------------------ Соединение двух точек цилиндром ---------------------------
// pointX - координаты 1й соединяемой точки (необязательно центр шара), pointY - координаты 2й точки,
// cylRad - радиус цилиндра, bondSize - порядок связи между молекулами,
// Nmaterial - материал второй половины цилиндра, coordCentr1 - центр шара 1, coordCenter2 - центр шара 2

function cylinderMesh(pointX, pointY, cylRad, bondSize, Nmaterial, coordCentr1, coordCenter2) {
    const direction = new THREE.Vector3().subVectors(pointX, pointY);
    const arrow = new THREE.ArrowHelper(
        direction.clone().normalize(), pointX, direction.length());

    const edgeGeometry = new THREE.CylinderGeometry(cylRad, cylRad, direction.length(), 36, 4);
    let edgeMesh = new THREE.Mesh(edgeGeometry, new THREE.MeshBasicMaterial({color: 0x0000ff}));
    edgeMesh.position.set(
        (pointX.getComponent(0) + pointY.getComponent(0)) / 2,
        (pointX.getComponent(1) + pointY.getComponent(1)) / 2,
        (pointX.getComponent(2) + pointY.getComponent(2)) / 2);
    edgeMesh.setRotationFromEuler(arrow.rotation);
    edgeMesh.userData = [coordCentr1, coordCenter2, cylRad, bondSize, Nmaterial];
    return edgeMesh;
}

// ОТРИСОВКА
var bond_arr = [];

var info = [];

function drawMolecule(url) {
    bond_arr = [];
    info = [];

    molecule.children = [];

    let molecule_data = JSON.parse(readFile(url));


// Объявление материалов и геометрий этих атомов
    for (let Name in atoms) {
        let material = new THREE.MeshPhongMaterial({
                color: atoms[Name][1], specular: 0x00b2fc, shininess: 90,
                blending: THREE.NormalBlending, depthTest: true
            }
        );
        materials.push(material);
        let geometry = new THREE.SphereGeometry(atoms[Name][2], 64, 64);
        geometries.push(geometry);
    }


// Информация о координатах молекулы (считывается из JSON-файла)
    let j = 0;
    for (let i = 0; i < molecule_data["PC_Compounds"][0]["atoms"]["aid"].length; i++) {
        let bond = [];
        while (molecule_data["PC_Compounds"][0]["bonds"]["aid1"][j] === i + 1) {
            bond.push(molecule_data["PC_Compounds"][0]["bonds"]["aid2"][j]);
            j++;
        }
        if (bond_arr.length >= 1) {
            for (let s = 0; s < i; s++) {
                if (bond_arr[s].indexOf(i + 1) !== -1) {
                    bond.push(s + 1)
                }
            }
        }
        bond_arr.push(bond);
    }


// Подсчет количества связей
    let order = [];
    for (let i = 0; i < molecule_data["PC_Compounds"][0]["bonds"]["aid1"].length; i++) {
        let n1 = molecule_data["PC_Compounds"][0]["bonds"]["aid1"][i];
        let n2 = molecule_data["PC_Compounds"][0]["bonds"]["aid2"][i];
        order[n1.toString() + ' ' + n2.toString()] = molecule_data["PC_Compounds"][0]["bonds"]["order"][i];
    }


// Список с информацией об атомах данной молекулы
// [num: номер элемента в молекуле, elem: номер в таблице Менделеева, xyz, bond: массив атомов, связанных с данным]
    let molecule_info_list = [];
    for (let i = 0; i < molecule_data["PC_Compounds"][0]["atoms"]["aid"].length; i++) {
        let bond = bond_arr[i].toString().replace(/,/g, ' ');
        const num = (i + 1).toString();
        const elem = molecule_data["PC_Compounds"][0]["atoms"]["element"][i].toString();
        const x = molecule_data["PC_Compounds"][0]["coords"][0]["conformers"][0]["x"][i].toString();
        const y = molecule_data["PC_Compounds"][0]["coords"][0]["conformers"][0]["y"][i].toString();
        const z = molecule_data["PC_Compounds"][0]["coords"][0]["conformers"][0]["z"][i].toString();
        molecule_info_list.push(num + " " + elem + " " + x + " " + y + " " + z + " " + bond)
    }


// Массив arr с информацией из info
    for (let i = 0; i < molecule_info_list.length; i++) {
        info[i] = molecule_info_list[i].match(/\S+/g);
    }

    let sphereId = {};

// Создаем Mesh-ы для сфер, добавляем в объект molecule
    for (let i = 0; i < info.length; i++) {
        let Name = info[i][1]; //номер элемента
        let Punct = new THREE.Mesh(geometries[atoms[Name][0]], materials[atoms[Name][0]]);
        Punct.position.set(
            parseFloat(info[i][2]),
            parseFloat(info[i][3]),
            parseFloat(info[i][4]));

        //userData [номер элемента в молекуле, номер элемента в таблице Менделеева]
        Punct.userData = [info[i][0], info[i][1], []];
        sphereId[(i + 1).toString()] = Punct.id;
        molecule.add(Punct);
    }


// Вспомогательный словарь для хранения всех id половинок между атомами
    let dictId = {};
    for (let pair in order) {
        dictId[pair] = [];
    }


// Соединяем атом с номером в начале массива с атомами, номера которых стоят на 5 и далее местах
    for (let i = 0; i < info.length; i++) {
        let num = info[i][0] - 1; //номер атома

        let cR;
        let k;
        let delta;
        let fingerLength;

        let num1Cord = new THREE.Vector3(parseFloat(info[num][2]), parseFloat(info[num][3]), parseFloat(info[num][4]));

        for (let j = 5; j < info[i].length; j++) {

            // Для построения двух цилиндров двух цветов
            let num2 = info[i][j] - 1; // номер атома

            let num2Cord = new THREE.Vector3(parseFloat(info[num2][2]), parseFloat(info[num2][3]), parseFloat(info[num2][4]));
            let halfCord = new THREE.Vector3(
                (num2Cord.x + num1Cord.x) / 2,
                (num2Cord.y + num1Cord.y) / 2,
                (num2Cord.z + num1Cord.z) / 2);

            let ord = (num + 1).toString() + ' ' + (num2 + 1).toString();
            let ord_reverse = (num2 + 1).toString() + ' ' + (num + 1).toString();

            // Для однинарной связи
            if ((order[ord] === 1) || (order[ord_reverse] === 1)) {
                cR = deltaSearch(1, info[num][1], info[num2][1]);

                fingerLength = cylinderMesh(
                    num1Cord, halfCord,
                    cR, 1, materials[atoms[info[num2][1]][0]], num1Cord, num2Cord);

                fingerLength.material = materials[atoms[info[i][1]][0]];

                if (dictId[ord] === undefined) {
                    ord = ord_reverse;
                }
                dictId[ord].push(fingerLength.id); // добавляем id пололовинки связи в хранилище (в других ветках if также)


                molecule.getObjectById(sphereId[num + 1]).userData[2].push(fingerLength.id); //  в каждый атом добавляем id его (ближней) половинки связи (в других ветках if также)
                fingerLength.userData.push(sphereId[num + 1]); // в половинку кладем id ближнег ок ней атома  (в других ветках if также)
                molecule.add(fingerLength);
            }

            // Для двойной связи
            if ((order[ord] === 2) || (order[ord_reverse] === 2)) {
                cR = deltaSearch(2, info[num][1], info[num2][1]);
                delta = cR;

                for (k = -1; k < 2; k += 2) {
                    fingerLength = cylinderMesh(
                        new THREE.Vector3(num1Cord.x + k * delta, num1Cord.y + k * delta, num1Cord.z + k * delta),
                        new THREE.Vector3(halfCord.x + k * delta, halfCord.y + k * delta, halfCord.z + k * delta),
                        cR, 2, materials[atoms[info[num2][1]][0]], num1Cord, num2Cord);

                    fingerLength.material = materials[atoms[info[i][1]][0]];

                    if (dictId[ord] === undefined) {
                        ord = ord_reverse;
                    }
                    dictId[ord].push(fingerLength.id);

                    molecule.getObjectById(sphereId[num + 1]).userData[2].push(fingerLength.id);
                    fingerLength.userData.push(sphereId[num + 1]);
                    molecule.add(fingerLength);
                }
            }

            // Для тройной связи
            if ((order[ord] === 3) || (order[ord_reverse] === 3)) {
                cR = deltaSearch(3, info[num][1], info[num2][1]);
                delta = cR * 2;

                for (k = -1; k < 2; k++) {
                    fingerLength = cylinderMesh(
                        new THREE.Vector3(num1Cord.x + k * delta, num1Cord.y + k * delta, num1Cord.z + k * delta),
                        new THREE.Vector3(halfCord.x + k * delta, halfCord.y + k * delta, halfCord.z + k * delta),
                        cR, 3, materials[atoms[info[num2][1]][0]], num1Cord, num2Cord);

                    fingerLength.material = materials[atoms[info[i][1]][0]];

                    if (dictId[ord] === undefined) {
                        ord = ord_reverse;
                    }
                    dictId[ord].push(fingerLength.id);

                    molecule.getObjectById(sphereId[num + 1]).userData[2].push(fingerLength.id);
                    fingerLength.userData.push(sphereId[num + 1]);
                    molecule.add(fingerLength);
                }
            }
        }
    }


// Раскрываем хранилище id половинок и в каждую половинку добавляем id всех половинок между двумя атомами
    for (let pair in dictId) {
        for (let id of dictId[pair]) {
            molecule.getObjectById(id).userData.push(dictId[pair]);
        }
    }
    
// Добавление молекулы в сцену
        scene.add(molecule);
}


//---------------------------------------- МАНИПУЛЯЦИИ С МОЛЕКУЛОЙ -------------------------------------------

var rotationSpeed = 6; // скорость вращения
var scaleSpeed = 1; // скорость увеличения/уменьшения

var isMouseDown = false; //нажата ли мышь
var isMouseMove = false; //двигается ли мышь

var raycaster = new THREE.Raycaster();
var intersect;
var mouse = new THREE.Vector2(); //координаты мыши
var fixedMouse = new THREE.Vector2(0, 0); // фиксированные координаты повора при отпуске мыши
var radians = new THREE.Vector2(0, 0); //координаты поворота при вращении


document.addEventListener('keydown', moleculeMover, false);

//--------------- Перемещение молекулы -----------------------

function moleculeMover(event) {

    //--------------------Обычное перемещение-------------------------------
    var moveSpeed = 0.1; // скорость премещения

    if (event.code === 'KeyW') {
        molecule.position.y += moveSpeed;
    }
    if (event.code === 'KeyS') {
        molecule.position.y -= moveSpeed;
    }
    if (event.code === 'KeyD') {
        molecule.position.x += moveSpeed;
    }
    if (event.code === 'KeyA') {
        molecule.position.x -= moveSpeed;
    }

//--------------- Перемещение камеры -----------------------
//     if (event.code === 'KeyT') {
//         camera.position.y += moveSpeed;
//     }
//
//     if (event.code === 'KeyG') {
//         camera.position.y -= moveSpeed;
//     }
//
//     if (event.code === 'KeyH') {
//         camera.position.x += moveSpeed;
//     }
//
//     if (event.code === 'KeyF') {
//         camera.position.x -= moveSpeed;
//     }
}

document.getElementById("my-canvas").addEventListener('mousemove', onDocumentMouseMove, false);
document.getElementById("my-canvas").addEventListener('mousedown', onDocumentMouseDown, false);
document.getElementById("my-canvas").addEventListener('mouseup', onDocumentMouseUp, false);
document.getElementById("my-canvas").addEventListener('mousewheel', onDocumentMouseWheel, false);
if (document.addEventListener) {
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    }, false);
} else {
    document.attachEvent('oncontextmenu', function () {
        window.event.returnValue = false;
    });
}


//--------------- Вращение молекулы (левая кнопка мыши) -----------------------

function moleculeRotator() {
    radians.x = Math.atan(mouse.x - fixedMouse.x);
    radians.y = Math.atan(mouse.y - fixedMouse.y);

    if (isMouseDown && isMouseMove) {
        molecule.rotation.x += radians.y;
        molecule.rotation.y += radians.x;
        fixedMouse.x = mouse.x;
        fixedMouse.y = mouse.y;
    }
}

//--------------- Увеличение/уменьшение молекулы (колесико) -----------------------
function onDocumentMouseWheel(event) {
    event.preventDefault();
    if ((camera.position.z + Math.sign(event.wheelDeltaY) * scaleSpeed) > 0) {
        camera.position.z += Math.sign(event.wheelDeltaY) * scaleSpeed;
    } else {
        camera.position.z = scaleSpeed;
        event.wheelDeltaY = 0;
    }
}

// Обработка кликов мышью
function onDocumentMouseDown(event) {
    // Клик правой кнопкой мыши
    if (event.button === 0) {
        isMouseDown = true;
        isMouseMove = false;
        fixedMouse.x = -(event.clientX / WIDTH) * rotationSpeed;
        fixedMouse.y = (event.clientY / HEIGHT) * rotationSpeed;
    }
    // Клик левой кнопкой мыши
    if (event.button === 2) {
        event.preventDefault();
        mouse.x = (event.clientX / WIDTH) * 2 - 1;
        mouse.y = -(event.clientY / HEIGHT) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        let intersects = raycaster.intersectObjects(molecule.children, false);
        if (intersects.length) {
            intersect = intersects[0].object;
            // Меню для добавления атома
            if (intersect.geometry.type === "SphereGeometry") {
                bond_menu.style.display = "none";
                atom_menu.style.left = (event.clientX - myCanvas.getBoundingClientRect().left + 20) + "px";
                atom_menu.style.top = (event.clientY - myCanvas.getBoundingClientRect().top - 120) + "px";
                atom_menu.style.display = "";
            }
            // Меню для изменения количества связей
            if (intersect.geometry.type === "CylinderGeometry") {
                atom_menu.style.display = "none";
                bond_menu.style.left = (event.clientX - myCanvas.getBoundingClientRect().left + 20) + "px";
                bond_menu.style.top = (event.clientY - myCanvas.getBoundingClientRect().top - 120) + "px";
                bond_menu.style.display = "";
            }
        } else {
            intersect = undefined;
            //--------------------------
            test_menu.style.display = "none";
            test_menu.style.left = (event.clientX - myCanvas.getBoundingClientRect().left + 20) + "px";
            test_menu.style.top = (event.clientY - myCanvas.getBoundingClientRect().top - 120) + "px";
            test_menu.style.display = "";
        }
    }
}


// Добавялем для массивов функцию удаления элемента по значению
// (используем только если нет одинаковых значений)
Array.prototype.remove = function (value) {
    var idx = this.indexOf(value);
    if (idx !== -1) {
        return this.splice(idx, 1);
    }
    return false;
};


//--------------- Добавление нового атома -----------------------
function addAtom(atomNumber) {
    // Проверка на добавление
    if (intersect.userData[2].length >= atoms[intersect.userData[1]][3]) {
        textArea.value = 'Нельзя добавить атом, так как нет свободной связи';
        atom_menu.style.display = "none";
        intersect = undefined;
        return;
    }

    textArea.value = '';

    //Добавление
    let id1, id2;
    let chosenAtom = new THREE.Vector3(intersect.position.x, intersect.position.y, intersect.position.z);
    let drawnAtom = new THREE.Vector3(intersect.position.x - 0.5, intersect.position.y - 0.5, intersect.position.z - 0.1);

    // Создание новой сферы
    Punct = new THREE.Mesh(geometries[atoms[atomNumber][0]], materials[atoms[atomNumber][0]]);
    Punct.position.set(intersect.position.x - 0.5, intersect.position.y - 0.5, intersect.position.z - 0.1);
    Punct.userData = [(info.length + 1).toString(), atomNumber.toString(), []];

    // Создание двух половинок соединяющего цилиндра (по умолчанию связь одинарная)
    cR = Math.min(intersect.geometry.parameters.radius, atoms[atomNumber][2]) / 2;

    fingerLength = cylinderMesh(
        chosenAtom,
        new THREE.Vector3((2 * intersect.position.x - 0.5) / 2, (2 * intersect.position.y - 0.5) / 2, (2 * intersect.position.z - 0.1) / 2),
        cR, 1, materials[atoms[atomNumber][0]], chosenAtom, drawnAtom);

    fingerLength.material = intersect.material;
    fingerLength.userData.push(intersect.id); // в половинку связи старого атома кидаем id этого атома
    id1 = fingerLength.id;
    intersect.userData[2].push(id1); // в атом к которому добавляем сохраняем id его половинки связи
    molecule.add(fingerLength);

    fingerLength = cylinderMesh(
        drawnAtom,
        new THREE.Vector3((2 * intersect.position.x - 0.5) / 2, (2 * intersect.position.y - 0.5) / 2, (2 * intersect.position.z - 0.1) / 2),
        cR, 1, intersect.material, chosenAtom, drawnAtom);

    fingerLength.material = materials[atoms[atomNumber][0]];
    fingerLength.userData.push(Punct.id); // в половинку связи нового атома кидаем id этого атома
    id2 = fingerLength.id;
    Punct.userData[2].push(id2); // в атом который создаем id его половинки связи
    molecule.add(fingerLength);
    molecule.add(Punct);


    // в каждую половинку добавляем информацию о всех id половинок между атомами
    molecule.getObjectById(id1).userData.push([id1, id2]);
    molecule.getObjectById(id2).userData.push([id1, id2]);

    // Добавление нового атома в arr
    info[parseInt(intersect.userData[0]) - 1].push((info.length + 1).toString());
    info.push([(info.length + 1).toString(), atomNumber.toString(),
        (drawnAtom.x).toString(), (drawnAtom.y).toString(), (drawnAtom.z).toString(),
        (intersect.userData[0]).toString()]);

    // Закрыть выпадающее меню
    atom_menu.style.display = "none";
    intersect = undefined;
}


//--------------- Изменение порядка связи -----------------------
function changeBond(bondCount) {
    // текущий порядок связи
    const currentBond = intersect.userData[3];

    //Проверка на изменение связи на ту же самую
    if (bondCount === currentBond) {
        textArea.value = 'Данная связь уже установлена';
        bond_menu.style.display = "none";
        intersect = undefined;
        return;
    }

    let sphere1Id, sphere2Id; //ближайший и дальний атом id
    sphere1Id = intersect.userData[5];

    let delta = currentBond - bondCount; //разница порядков текущей связи и желаемой
    let ords_id = intersect.userData[6]; // все id старых половинок
    for (let id of ords_id) {
        if (molecule.getObjectById(id).userData[5] !== sphere1Id) {
            sphere2Id = molecule.getObjectById(id).userData[5];
            break;
        }
    }

    // Проверка на возможность изменить связь
    let val1 = molecule.getObjectById(sphere1Id).userData[2].length; // валентности двух связанных изменяемой связью атомов
    let val2 = molecule.getObjectById(sphere2Id).userData[2].length;

    let currentVal1 = atoms[molecule.getObjectById(sphere1Id).userData[1]][3]; // количество уже занятых валентных связей
    let currentVal2 = atoms[molecule.getObjectById(sphere2Id).userData[1]][3]; // для каждого атома

    if (((val1 - delta) > currentVal1) || ((val2 - delta) > currentVal2)) { // если попытка изменить порядок связи на недопустимо большой - ошибка
        textArea.value = 'Нельзя поменять порядок связи - недостаточно свободных связей';
        bond_menu.style.display = "none";
        intersect = undefined;
        return;
    }

    textArea.value = '';

    // Изменение связи
    let deletedId1 = []; // список id половинок которые надо удалить из ближнего атома
    let deletedId2 = []; // список id половинок которые надо удалить из дальнего атома

    // удаляем все старые половинки (а так же раскидываем их id спискам созданным выше)
    for (let id of ords_id) {
        if (molecule.getObjectById(id).userData[5] !== sphere1Id) {
            sphere2Id = molecule.getObjectById(id).userData[5];
            deletedId2.push(id);
        } else deletedId1.push(id);
        molecule.remove(molecule.getObjectById(id))
    }

    //убираем из атомов id половинок, которые удалили
    for (i = 0; i < deletedId1.length; i++) {
        molecule.getObjectById(sphere1Id).userData[2].remove(deletedId1[i]);
        molecule.getObjectById(sphere2Id).userData[2].remove(deletedId2[i]);
    }

    // Список для id новых половинок
    let ids = [];

    const sphere1 = intersect.userData[0];
    const sphere2 = intersect.userData[1];

    // Установка толщины связи
    if (currentBond === 1 && bondCount === 2) {
        cR = intersect.userData[2] * 3 / 4;
    }
    if (currentBond === 1 && bondCount === 3) {
        cR = intersect.userData[2] * 3 / 8;
    }
    if (currentBond === 2 && bondCount === 1) {
        cR = intersect.userData[2] * 4 / 3;
    }
    if (currentBond === 2 && bondCount === 3) {
        cR = intersect.userData[2] / 2;
    }
    if (currentBond === 3 && bondCount === 1) {
        cR = intersect.userData[2] * 8 / 3;
    }
    if (currentBond === 3 && bondCount === 2) {
        cR = intersect.userData[2] * 2;
    }

    // Одинарная связь
    if (bondCount === 1) {
        fingerLength = cylinderMesh(
            sphere1,
            new THREE.Vector3((sphere1.x + sphere2.x) / 2, (sphere1.y + sphere2.y) / 2, (sphere1.z + sphere2.z) / 2),
            cR, bondCount, intersect.userData[4], sphere1, sphere2);

        fingerLength.material = intersect.material;
        ids.push(fingerLength.id);
        fingerLength.userData.push(sphere1Id); // добавляем в новую половинку id ближайшего атома
        molecule.getObjectById(sphere1Id).userData[2].push(fingerLength.id); // а в атом кидаем id его новой половинки
        molecule.add(fingerLength);

        fingerLength = cylinderMesh(
            new THREE.Vector3((sphere1.x + sphere2.x) / 2, (sphere1.y + sphere2.y) / 2, (sphere1.z + sphere2.z) / 2),
            sphere2,
            cR, bondCount, intersect.material, sphere1, sphere2);

        fingerLength.material = intersect.userData[4];
        ids.push(fingerLength.id);
        fingerLength.userData.push(sphere2Id); // добавляем в новую половинку id ближайшего атома
        molecule.getObjectById(sphere2Id).userData[2].push(fingerLength.id); // а в атом кидаем id его новой половинки
        molecule.add(fingerLength);
    }

    // Двойная связь
    if (bondCount === 2) {
        for (var i = -1; i < bondCount; i += 2) {
            fingerLength = cylinderMesh(
                new THREE.Vector3(sphere1.x + i * cR, sphere1.y + i * cR, sphere1.z + i * cR),
                new THREE.Vector3(((sphere1.x + sphere2.x) / 2) + i * cR, ((sphere1.y + sphere2.y) / 2) + i * cR, ((sphere1.z + sphere2.z) / 2) + i * cR),
                cR, bondCount, intersect.userData[4], sphere1, sphere2);

            fingerLength.material = intersect.material;
            ids.push(fingerLength.id);
            fingerLength.userData.push(sphere1Id); // добавляем в новую половинку id ближайшего атома
            molecule.getObjectById(sphere1Id).userData[2].push(fingerLength.id); // а в атом кидаем id его новой половинки
            molecule.add(fingerLength);

            fingerLength = cylinderMesh(
                new THREE.Vector3(((sphere1.x + sphere2.x) / 2) + i * cR, ((sphere1.y + sphere2.y) / 2) + i * cR, ((sphere1.z + sphere2.z) / 2) + i * cR),
                new THREE.Vector3(sphere2.x + i * cR, sphere2.y + i * cR, sphere2.z + i * cR),
                cR, bondCount, intersect.material, sphere1, sphere2);

            fingerLength.material = intersect.userData[4];
            ids.push(fingerLength.id);
            fingerLength.userData.push(sphere2Id); // добавляем в новую половинку id ближайшего атома
            molecule.getObjectById(sphere2Id).userData[2].push(fingerLength.id); // а в атом кидаем id его новой половинки
            molecule.add(fingerLength);
        }
    }

    // Тройная связь
    if (bondCount === 3) {
        for (var i = -2; i < 3; i += 2) {
            fingerLength = cylinderMesh(
                new THREE.Vector3(sphere1.x + i * cR, sphere1.y + i * cR, sphere1.z + i * cR),
                new THREE.Vector3(((sphere1.x + sphere2.x) / 2) + i * cR, ((sphere1.y + sphere2.y) / 2) + i * cR, ((sphere1.z + sphere2.z) / 2) + i * cR),
                cR, bondCount, intersect.userData[4], sphere1, sphere2);

            fingerLength.material = intersect.material;
            ids.push(fingerLength.id);
            fingerLength.userData.push(sphere1Id); // добавляем в новую половинку id ближайшего атома
            molecule.getObjectById(sphere1Id).userData[2].push(fingerLength.id); // а в атом кидаем id его новой половинки
            molecule.add(fingerLength);

            fingerLength = cylinderMesh(
                new THREE.Vector3(((sphere1.x + sphere2.x) / 2) + i * cR, ((sphere1.y + sphere2.y) / 2) + i * cR, ((sphere1.z + sphere2.z) / 2) + i * cR),
                new THREE.Vector3(sphere2.x + i * cR, sphere2.y + i * cR, sphere2.z + i * cR),
                cR, bondCount, intersect.material, sphere1, sphere2);

            fingerLength.material = intersect.userData[4];
            ids.push(fingerLength.id);
            fingerLength.userData.push(sphere2Id); // добавляем в новую половинку id ближайшего атома
            molecule.getObjectById(sphere2Id).userData[2].push(fingerLength.id); // а в атом кидаем id его новой половинки
            molecule.add(fingerLength);
        }
    }

    // добавляем в каждую новую половинку информацию о всех id новых половинок
    for (let id of ids) {
        molecule.getObjectById(id).userData = molecule.getObjectById(id).userData.concat([ids]);
    }

    // Закрыть выпадающее меню
    bond_menu.style.display = "none";
    intersect = undefined;

}


//--------------- Удаление атома -----------------------
function deleteAtom() {
    if (info[parseInt(intersect.userData[0]) - 1].length === 6) { // если атом крайний:
        let deletedCilyndrsIds = molecule.getObjectById(intersect.userData[2][0]).userData[6]; // id всех половинок которые удаляем

        // идём по этим половинкам и ищем ту в которой будет id второго шара, чтобы убрать из него id удаленных половинок и поменять arr
        var deleteIdFlag = false;
        var deletedIds = []; // id упоминания о которых надо удалить из оставшегося атома
        var idAtom; // id атома который остается
        for (var id of deletedCilyndrsIds) { // идем по всем половинкам между атомами
            if (deleteIdFlag === false) {
                if (molecule.getObjectById(id).userData[5] !== intersect.id) { // их них собираем id которые хранятся во втором атоме
                    deletedIds.push(id);
                    idAtom = molecule.getObjectById(id).userData[5];
                }
                if (deletedIds.length === deletedCilyndrsIds.length / 2) { // как только собрали удаляем эти id из атома который останется
                    for (delId of deletedIds)
                        molecule.getObjectById(idAtom).userData[2].remove(delId);
                    // и раз уж сюда в if зайдем один раз, то очищаем для оставшегося атома информацию в arr
                    let num = parseInt(molecule.getObjectById(idAtom).userData[0]); // номер оставшегося атома
                    let deletedNum = intersect.userData[0]; // номер удаляемого атома
                    for (i = 5; ; i++) { // идем по arr оставшего атома и как тока встречаем удаленный атом - стираем
                        if (info[num - 1][i] === deletedNum) {
                            info[num - 1].splice(i, 1); // удаление номера
                            break;
                        }
                    }
                    info[deletedNum - 1] = null;
                    deleteIdFlag = true;
                }
            }
            molecule.remove(molecule.getObjectById(id)); // удаляем половинку
        }

        molecule.remove(molecule.getObjectById(intersect.id)); // удаление шара

        textArea.value = '';
        // molecule.getObjectById(idAtom).userData[2].length
    } else {
        // Ошибка удаления
        textArea.value = 'Нельзя удалить не крайний атом';
    }

    // Закрыть выпадающее меню
    atom_menu.style.display = "none";
    intersect = undefined;
}

function onDocumentMouseUp(event) {
    event.preventDefault();
    isMouseDown = false;
    isMouseMove = false;
}

function onDocumentMouseMove(event) {
    event.preventDefault();
    if (isMouseDown) {
        mouse.x = -(event.clientX / WIDTH) * rotationSpeed;
        mouse.y = (event.clientY / HEIGHT) * rotationSpeed;
        isMouseMove = true;
    }
}

function render() {

    requestAnimationFrame(render);

    moleculeRotator();

    light.position = camera.position;

    renderer.render(scene, camera);
}

drawMolecule('Aspirin.json');

render();