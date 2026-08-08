var NUMBER = 10;
var defaultAutoTime = 600000;   // 自動更新間隔（ms）0以下の場合、自動更新なし。
var autoTime = -1;              // 自動更新間隔 (ms) 
var paraName  = new Array(NUMBER);  // サーバへ送信するパラメータ。10個まで。
var paraValue = new Array(NUMBER);

/**
 * パラメータの設定
 */
function setParameter(name,value) {
    index = checkParameter(name);
    if (index == -1) {
        for(i=0; i<NUMBER; i++) {
            if (paraName[i] == null) {
                paraName[i] = name;
                paraValue[i] = value;
                break;
            }
        }
    } else {
        paraName[index] = name;
        paraValue[index] = value;
    }
}

/**
 * パラメータのチェック
 */
function checkParameter(name) {
    for(i=0; i<NUMBER; i++) {
        if (paraName[i] == name) return i;
    }
    return -1;
}

/**
 * パラメータの取得
 */
function getParameter() {
    var v;
    if (paraName[0] == null) return "";
    else    v = paraName[0] + "=" + paraValue[0];

    for(i=1; i<NUMBER; i++) {
        if (paraName[i] == null)    return v;
        v += ("?" + paraName[i] + "=" + paraValue[i]);
    }
    return v;
}

/**
 * 表示内容の切替え
 */
function chengeForm(gamen) {
    var html = gamen + "?param=" + getParameter();
//alert("html=["+html+"]"); // for DEBUG
    window.open(encodeURI(html), "_self");
}

/**
 * メニュー画面へ遷移
 */
function chengeTop(gamen) {
    window.open(encodeURI(gamen), "_self");
}

/**
 * 時刻直接指定
 */
function timeWinSet(gamen, name, form, m) {
    var sdate = $(':text[id="datepicker"]').val();//datepicker date get
    sdate = sdate.replace(/\//g, "-");
    var itime = document.getElementById('stime').value;
    itime = itime.replace(/:/g, "-");
    if (m=='10') v = sdate + "-" + itime;
    else v = sdate + "-" + itime.substr(0,2);
    setParameter(name,v);
    setParameter("common",commonParam);
    chengeForm(gamen);
}

/**
 * 初期処理
 */
function init() {
    autoTime = defaultAutoTime; // 自動更新開始
    gamenReload();  // 画面の再読み込み
}

/**
 * 初期処理（自動更新無し）
 */
function initOff() {
    autoTime = -1;  // 自動更新ＯＦＦ
    gamenReload();  // 画面の再読み込み
}

/**
 * 画面の再読み込み
 */
function gamenReload() {
    if (autoTime > 0)   window.setTimeout("gamenLoad()", autoTime);
}

/**
 * 再読み込み
 */
function gamenLoad() {
    setParameter("common",commonParam);
    setParameter("auto","1");
    chengeForm(location.pathname);
}

/**
 * 現在時刻の表示
 */
function nowTime() {
    now   = new Date();
    year  = now.getYear();
    month = now.getMonth()+1;
    day   = now.getDate();
    hour  = now.getHours();
    min   = now.getMinutes();
    sec   = now.getSeconds();

    if (month < 10) month = "0" + month;
    if (day   < 10) day   = "0" + day;
    if (hour  < 10) hour  = "0" + hour;
    if (min   < 10) min   = "0" + min;
    if (sec   < 10) sec   = "0" + sec;

    document.date.t1.value = year + "/" + month + "/" + day;
    document.date.t2.value = hour + ":" + min + ":" + sec;
    window.setTimeout("nowTime()", 1000);
}

/**
 * 区分、観測局の切替え
 */
function chengeStation(gamen, name, selection) {
    v1 = selection.selectedIndex;
    setParameter(name,v1);
    setParameter("common",commonParam);
    chengeForm(gamen);
}

/**
 * 区分、観測局の切替え (ダム状況図用)
 */
function chengeStation2(gamen, name, selection) {
    v1 = selection.selectedIndex - 1;
    setParameter(name,v1);
    setParameter("common",commonParam);
    chengeForm(gamen);
}

/**
 * 区分、観測局の切替え。
 * 最新データの表示
 */
function chengeStationNow(gamen, name, selection, name2, value) {
    v1 = selection.selectedIndex;
    setParameter(name,v1);
    setParameter(name2,value);
    setParameter("common",commonParam);
    chengeForm(gamen);
}

/**
 * データ表示間隔の切替え
 */
function chengeSelect(gamen, name, interval) {
    setParameter(name,interval);
    setParameter("common",commonParam);
    chengeForm(gamen);
}

/**
 * データ表示間隔の切替え(ダム状況図用)
 */
function chengeSelect2(gamen, name1, selection, name2, value2) {
    v1 = selection.selectedIndex;
    v2 = selection.options[v1].value;
    chengeCommon2(name1,v2);
    chengeCommon2(name2,value2);
    chengeForm(gamen);
}

/**
 * 区分、観測局の切替え(CSV要求、画面遷移無し)
 */
function chengeSelectCsv(name, selection) {
    v1 = selection.selectedIndex;
    v2 = selection.options[v1].value;
    setParameter(name,v1);
}

/**
 * 値の変更
 */
function chengeValue(gamen, name, value) {
    setParameter(name,value);
    setParameter("common",commonParam);
    chengeForm(gamen);
}
function chengeValue2(gamen, name, value) {
    setParameter("freeNo",1);
    setParameter(name,value);
    setParameter("common",commonParam);
    chengeForm(gamen);
}
function chengeValueDamu(gamen, name, value) {
    setParameter("area",4);
    setParameter(name,value);
    setParameter("common",commonParam);
    chengeForm(gamen);
}
function chengeValueJishin(gamen, name, value) {
    setParameter(name,value);
    setParameter("common",commonParam);
    var element = document.getElementById("frm"); 
    element.action = gamen + "?param=" + getParameter();
    element.target="_self";
    element.submit();
}

/**
 * 他画面遷移
 */
function chengeGamen(gamen) {
    setParameter("common",commonParam);
    chengeForm(gamen);
}
/**
 * 他画面遷移。引数あり。
 */
function chengeGamen2(gamen, name, value) {
    chengeCommon(name,value);
    chengeForm(gamen);
}
/**
 * 他画面遷移。引数あり。
 */
function chengeGamenAbnormal(gamen, name1, value1, name2, value2) {
    chengeCommon2(name1,value1);
    chengeCommon2(name2,value2);
    chengeForm(gamen);
}

/**
 * サブ画面からメイン画面を遷移。引数あり。
 */
function mainChengeGamenMizuAme(gamen, name1, value1, name2, value2) {
    // メインウィンドウの存在をチェック
    if(!window.opener || window.opener.closed){
        window.alert('メインウィンドウがありません');
    }else{
        chengeCommon2(name1,value1);
        chengeCommon2(name2,value2);
        url = gamen + "?param=" + getParameter();
        window.opener.location.href = encodeURI(url);
    }
}
function mainChengeGamen(gamen, name1, value1, name2, value2) {
    // メインウィンドウの存在をチェック
    if(!window.opener || window.opener.closed){
        window.alert('メインウィンドウがありません');
    }else{
        setParameter("common",commonParam);
        chengeCommon(name1,value1);
        chengeCommon(name2,value2);
        url = gamen + "?param=" + getParameter();
        window.opener.location.href = encodeURI(url);
    }
}

/**
 * 他画面遷移
 */
function chengeGamen3(gamen) {
    setParameter();
    chengeForm(gamen);
}

/**
 * サブウィンドウ表示
 * gamen : 画面名
 * wname : ウインドウ名
 * left  : 表示位置左側
 * top   : 表示位置上
 * width : ウインド横幅
 * height: ウインド縦
 * name  : 引数名
 * value : 値
 */
function showWindow(gamen, wname, left, top, width, height, name, value) {
    setParameter(name, value);
    setParameter("common",commonParam);
    var html = gamen + "?param=" + getParameter();
    param = "left=" + left + ",top=" + top + ",width=" + width + ",height=" + height + ",location=no,toolbar=no,scrollbars=yes,resizable=yes";
    window.open(encodeURI(html), wname, param).focus();
//    document.getElementById("submit").click();
}
/**
 * サブウィンドウ表示（アドレスバー・タブ等あり）
 * gamen : 画面名
 * wname : ウインドウ名
 * left  : 表示位置左側
 * top   : 表示位置上
 * width : ウインド横幅
 * height: ウインド縦
 * name  : 引数名
 * value : 値
 */
function showWindow2(gamen, wname, left, top, width, height, name, value) {
    //setParameter(name, value);
    //setParameter("common",commonParam);
    //var html = gamen + "?param=" + getParameter();
    var html = gamen;
    param = "left=" + left + ",top=" + top + ",width=" + width + ",height=" + height + ",location=yes,toolbar=yes,scrollbars=yes,resizable=yes";
    window.open(encodeURI(html), wname, param).focus();
//    document.getElementById("submit").click();
}

/**
 * サブウィンドウ表示
 * gamen : 画面名
 * wname : ウインドウ名
 * left  : 表示位置左側
 * top   : 表示位置上
 * width : ウインド横幅
 * height: ウインド縦
 * name  : 引数名
 * value : 値
 */
function showWindowMap(gamen, wname, name, value) {
    setParameter(name, value);
    setParameter("common",commonParam);
    var html = gamen + "?param=" + getParameter();
    param = "location=no,toolbar=no,scrollbars=yes,resizable=yes";
    window.open(encodeURI(html), wname, param).focus();
//    document.getElementById("submit").click();
}

/**
 * サブウィンドウ表示
 * gamen : 画面名
 * wname : ウインドウ名
 * left  : 表示位置左側
 * top   : 表示位置上
 * width : ウインド横幅
 * height: ウインド縦
 * name  : 引数名
 * value : 値
 */
function showWindowMap(gamen, wname, left, top, width, height, name, value) {
    setParameter(name, value);
    setParameter("common",commonParam);
    var html = gamen + "?param=" + getParameter();
    param = "left=" + left + ",top=" + top + ",width=" + width + ",height=" + height + ",location=no,toolbar=no,scrollbars=yes,resizable=yes";
    window.open(encodeURI(html), wname, param).focus();
//    document.getElementById("submit").click();
}

/**
 * サブウィンドウ表示
 * gamen : 画面名
 * wname : ウインドウ名
 * left  : 表示位置左側
 * top   : 表示位置上
 * width : ウインド横幅
 * height: ウインド縦
 * name  : 引数名
 * value : 値
 */
function showWindowAmeMizu(gamen, wname, left, top, width, height, name, value, stnline, stncity) {
    setParameter(name, value);
    setParameter("common",commonParam);
    var html = gamen + "?stnLine=" + stnline + "&stnCity=" + stncity +  "&param=" + getParameter();
    param = "left=" + left + ",top=" + top + ",width=" + width + ",height=" + height + ",location=no,toolbar=no,scrollbars=yes,resizable=yes";
    window.open(encodeURI(html), wname, param).focus();
//    document.getElementById("submit").click();
}


/**
 * 共通パラメータの変更
 * 単一のパラメータ変更を変更して画面遷移する際に使用。
 */
function chengeCommon(name, value) {
    nameLen = name.length;
    allLen = commonParam.length;
    namePos = commonParam.indexOf(name, 0);
    str1 = commonParam.substr(namePos + nameLen, allLen);
    idx1 = str1.indexOf("$",0);
    target = str1.substr(0, idx1);
    targetLen = target.length;
//alert("target=["+target+"]");
    before = commonParam.substr(0, namePos + nameLen);
    afterPos = namePos + nameLen + targetLen;
    after = commonParam.substr(afterPos, allLen - afterPos);
//alert("before=["+before+"] after=["+after+"]");
    cmnPara = before + ":" + value + after;
    setParameter("common",cmnPara);
//alert("cmnPara=["+cmnPara+"]  commonParam=["+commonParam+"]");
}
/**
 * 共通パラメータの変更
 * 複数パラメータ変更を変更して画面遷移する際に使用。
 */
function chengeCommon2(name, value) {
    nameLen = name.length;
    allLen = commonParam.length;
    namePos = commonParam.indexOf(name, 0);
    str1 = commonParam.substr(namePos + nameLen, allLen);
    idx1 = str1.indexOf("$",0);
    target = str1.substr(0, idx1);
    targetLen = target.length;
//alert("target=["+target+"]");
    before = commonParam.substr(0, namePos + nameLen);
    afterPos = namePos + nameLen + targetLen;
    after = commonParam.substr(afterPos, allLen - afterPos);
//alert("before=["+before+"] after=["+after+"]");
    commonParam = before + ":" + value + after;
    setParameter("common",commonParam);
//alert("commonParam=["+commonParam+"]");
}

/**
 * フォントの色を変更する。
 */
function colorChenge(myID, color) {
    myObj = getStyleObj(myID);
    if (myObj)  myObj.color = color;
}

/**
 * イメージを変更する。
 */
function imgChenge(myID, img) {
    myObj = getElementObj(myID);
    if (myObj)   myObj.src = img;
}

menuFlag=0; // 選択中のサブメニュー

/**
 * サブメニューの表示
 */
function showMenu(myID) {
  if (myID == menuFlag) { // 同じメニュー項目選択時は消去する。
    hideMenu();
    menuFlag=0;
  } else {
    showObj(myID);
    menuFlag=myID;
  }
}

/**
 * サブメニューの消去
 */
function hideMenu() {
  menu = new Array('menu1','menu2','menu3'); // メニュー項目

  for(i=0; i<menu.length; i++) {
    hideObj(menu[i]);
  }
}


/**
 * ブラウザ毎のオブジェクト取得
 */
function getStyleObj(myID) {
    myN6 = document.getElementById; // NN6時のオブジェクト取得
    myIE = document.all;            // IE時のオブジェクト取得
    myNN = document.layers;         // NN4時のオブジェクト取得
    if (myIE) return document.all(myID).style;
    if (myN6) return document.getElementById(myID).style;
    if (myNN) return document[myID];
    return 0;
}

/**
 * ブラウザ毎のオブジェクト取得
 */
function getElementObj(myID) {
    myN6 = document.getElementById; // NN6時のオブジェクト取得
    myIE = document.all;            // IE時のオブジェクト取得
    myNN = document.layers;         // NN4時のオブジェクト取得
    if (myIE) return document.all(myID);
    if (myN6) return document.getElementById(myID);
    if (myNN) return document[myID];
    return 0;
}

/**
 * オブジェクトの表示
 */
function dispObj(myID, myVisibility) {
    myObj = getStyleObj(myID);
    if (myObj) myObj.visibility = myVisibility;
}

/**
 * オブジェクトの表示
 */
function showObj(myID) {
    dispObj(myID, "visible");
}

/**
 * オブジェクトの非表示
 */
function hideObj(myID) {
    dispObj(myID, "hidden");
}

/**
 * カーソルの選択表示
 */
function cursorPoint(myID) {
    chengeCursor(myID, "pointer");
}

/**
 * カーソルのデフォルト表示
 */
function cursorDef(myID) {
    chengeCursor(myID, "default");
}

/**
 * カーソルの変更
 */
function chengeCursor(myID, myCursor) {
    myObj = getStyleObj(myID);
    if (myObj) myObj.cursor = myCursor;

}
/*
 * コントロールを使用不可にする
 */
function ctrlDisabled(id) {
    var obj = document.getElementById(id);
    obj.disabled = true;
}

/*
 * コントロールを使用可能にする
 */
function ctrlEnabled(id) {
    var obj = document.getElementById(id);
    obj.disabled = false;
}

/*
 * コントロールを可視状態にする
 */
function ctrlInVisible(id) {
    var obj = document.getElementById(id);
    obj.style.display = 'none';
}

/*
 * コントロールを不可視状態にする
 */
function ctrlVisible(id) {
    var obj = document.getElementById(id);
    obj.style.display = 'inline';
}

/**
 * パラメータクリア
 */
function clearParameter() {
    for(i=0; i<NUMBER; i++) {
        paraName[i] = null;
        paraValue[i] = null;
    }
}

/**
 * パラメータ取得
 */
function getRequest(){
    if(location.search.length > 1) {
        var get = new Object();
        var ret = location.search.substr(1).split("?");
        for(var i = 0; i < ret.length; i++) {
            var r = ret[i].split("=");
            j = 0;
            if(r[0] == "param") {
                if(r.lengrh < 3) continue;
                j = 1;
            }
            get[r[j]] = r[j+1];
        }
        return get;
    } else {
        return null;
    }
}

/** 
 *データ表示エリア切替
 * hei1:外枠の縦の設定値  hei2:内の縦の設定値 
 * wid3:地図外枠の幅の設定値 hei3:地図外枠の縦の設定値
 * lef3:左側スペース
 */
function dispSwitch(hei1, hei2, wid3, hei3, lef3){
    // 全域と各地区の表示領域を切替える
    var csschg1 = document.getElementById('Opretblock');
    csschg1.style.height=hei1+"px";
    var csschg2=document.getElementById('Opretblock_base');
    csschg2.style.height=hei2+"px";
    var csschg3=document.getElementById('Mapblock_base');
    csschg3.style.width=wid3+"px";
    csschg3.style.height=hei3+"px";
    csschg3.style.left=lef3+"px";
}

// 遅延
function Sleep( milli_second )
{
    var start = new Date();
    while( new Date() - start < milli_second );
}

// ブラウザー種別判定
function browserName() {
    var userAgent = window.navigator.userAgent.toLowerCase();
    var appVersion = window.navigator.appVersion.toLowerCase();

    if (userAgent.indexOf('opera') != -1) {
      return 'opera';
    } else if (userAgent.indexOf("msie") != -1) {
      if (appVersion.indexOf("msie 6.") != -1) {
        return 'ie6';
      } else if (appVersion.indexOf("msie 7.") != -1) {
        return 'ie7';
      } else if (appVersion.indexOf("msie 8.") != -1) {
        return 'ie8';
      } else if (appVersion.indexOf("msie 9.") != -1) {
        return 'ie9';
      } else if (appVersion.indexOf("msie 10.") != -1) {
        return 'ie10';
      } else if (appVersion.indexOf("msie 11.") != -1) {
        return 'ie11';
      } else if (appVersion.indexOf("msie 12.") != -1) {
        return 'ie12';
      } else {
        return 'ie';
      }
    } else if (userAgent.indexOf('chrome') != -1) {
        return 'chrome';
    }
    return '';
}
// レベル表記の取得
function getLevel(num) {
    // 警報レベル5の表記はしない。
    if (num == 5){
      return;
    }
    var zenkaku = '';
    String(num).split('').forEach(function (s) {
        zenkaku += String.fromCharCode(s.charCodeAt(0) + 65248);
    });
    document.getElementById( "level"+ String(num) ).innerHTML = "（レベル" + zenkaku + "水位）" ;
}

