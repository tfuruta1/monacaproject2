// ニフクラ Mobile Backendの接続準備
var ncmb = new NCMB(
    '2b554699e3e218d94cefbb9342ea7b7465ec79b3e1af2f59fbe00c04f3ac6e76',
    '0a82e730665bc4bbd72a92de71127b98b690b6225b6ae7c14c127704707b79ac'
);

// ページ初期化時
document.addEventListener('show', function(event) {
    var page = event.target;
    if(page.id === 'register_page') {
        // 打刻画面を開いた時
        getTodayData();
        // ロールを取得
        getRole();
    } else if(page.id === 'employee_list_page') {   
        // 社員一覧画面を開いた時
        getUsers();
    } else if (page.id === 'edit_employee_page') {   
        // 社員情報編集画面を開いた時
        // パラメータを取得
        var objectId = page.data.objectId;
        // 当該ユーザーの情報を表示
        ncmb.User.fetchById(objectId)
            .then(function(user) {
                page.querySelector('[name="employee_no"]').value = user.get('employeeNo');
                page.querySelector('[name="employee_name"]').value = user.get('userName');
                page.querySelector('[name="employee_pw"]').value = user.get('password');
            })
            .catch(function(error) {
                alert(JSON.stringify(error));
            });

        // 更新ボタン・削除ボタンの設定
        page.querySelector('#update_employee_btn').onclick = function() {
            updateEmployee(objectId);
        };
        page.querySelector('#delete_employee_btn').onclick = function() {
            deleteEmployee(objectId);
        };
    } else if(page.id === 'monthly_records_page') {   
        // 社員別月間出退勤データ参照画面を開いた時
        // パラメータを取得
        var objectId = page.data.objectId;
        // 現在の日付データ、先月の日付データ、翌月の日付データを取得
        var date = new Date();
        var prevMonth = new Date(date.getFullYear(), date.getMonth() - 1);
        var nextMonth = new Date(date.getFullYear(), date.getMonth() + 1);
        
        // 月間出退勤データ取得
        getMonthlyRecords(objectId, date);
        // 先月ボタン、翌月ボタンのイベント設定
        page.querySelector('#prev_btn').onclick = function() {
            getMonthlyRecords(objectId, prevMonth);
        };
        page.querySelector('#next_btn').onclick = function() {
            getMonthlyRecords(objectId, nextMonth);
        };
    }
});

// ログイン
function login() {
    var username = document.querySelector('#username').value;
    var password = document.querySelector('#password').value;

    /***** STEP(1)-1 ログイン *****/
    ncmb.User
      .login(username, password)
      .then(function(user){
        console.log(JSON.stringify(user));
        document.querySelector('#navi').pushPage('register.html');
      })
      .catch(function(error){
        alert(JSON.stringify(error));
      });


    /***** STEP(1)-1 ここまで *****/
}

// ログアウト
function logout() {
    /***** STEP(1)-2 ログアウト *****/
    ncmb.User.logout();
    alert('ログアウトしました');
    document.querySelector('#navi').popPage();


    /***** STEP(1)-2 ここまで *****/
}

// ログイン後、ロールを取得して権限制御する
function getRole() {
    /***** STEP(2) 権限制御 *****/
  ncmb.Role
    .equalTo('roleName', 'admin')
    .fetch()
    .then(function(role){
      //adminロール内ユーザーの取得
      role.fetchUser()
        .then(function(adminUsers){
            //ログインユーザーがadminロールに所属しているかどうか
            var currentUser = ncmb.User.getCurrentUser();
            for(var i = 0; i < adminUsers.length;i++){
              if (currentUser.get('objectId') === adminUsers[i].get('objectId')){
                //adminロールであれば、社員一覧画面へ遷移するボタンを表示
                document.querySelector('#list_btn').style['display'] = 'block';
                break;
              }
            }
        });
    });


    /***** STEP(2) ここまで *****/
}

// 社員一覧取得
function getUsers() {
    ncmb.User
        .order('employeeNo')
        .fetchAll()
        .then(function(users) {
            var list = document.querySelector('#employee_list');
            list.textContent = '';
            users.forEach(function(user) {
                var template = 
                    '<ons-list-item tappable modifier="longdivider" onclick="document.querySelector(\'#navi\').pushPage(\'monthly_records.html\', {data: {objectId: \'' + user.get('objectId') + '\'}})">' +
                        '<ons-row>' +
                            '<ons-col name="employee_no" width="100px">' + user.get('employeeNo') + '</ons-col>' +
                            '<ons-col name="employee_name">' + user.get('userName') + '</ons-col>' +
                        '</ons-row>' +
                    '</ons-list-item>';
                ons.createElement(template, {append:list});
            });
     });
}

// 社員情報登録
function addEmployee() {
    var page = document.querySelector('#navi').topPage;
    var employee_no = page.querySelector('[name=employee_no]').value;
    var employee_name = page.querySelector('[name=employee_name]').value;
    var employee_pw = page.querySelector('[name=employee_pw]').value;

    /***** STEP(3) ユーザー登録・更新 *****/
    var user = new ncmb.User();
    var acl = setUserAcl();
    //ユーザー登録実行
    user.set('userName', employee_name)
        .set('password', employee_pw)
        .set('employeeNo', employee_no)
        .set('acl',acl)
        .signUpByAccount()
        .then(function(registUser){
          console.log("registuser:"+JSON.stringify(registUser));
          //aclに本人を追加して、ユーザー情報更新
          var newAcl = setUserAcl(registUser);
          user.set('acl', newAcl)
              .update()
              .then(function(){
                alert("登録しました");
                document.querySelector('#navi').popPage();
              });
        })
        .catch(function(error){
          alert(JSON.stringify(error));
        });


    /***** STEP(3) ここまで *****/
}

// ユーザデータの権限設定
function setUserAcl(currentUser) {
    var acl = new ncmb.Acl();  
    acl.setRoleReadAccess('admin', true) // adminロールの読み込みを許可
       .setRoleWriteAccess('admin', true); // adminロールの書き込みを許可
    if(currentUser) {
        acl.setUserReadAccess(currentUser, true)  // 本人の読み込みを許可
           .setUserWriteAccess(currentUser, true);  // 本人の書き込みを許可
    }
    
    return acl;
}

// 社員情報削除
function deleteEmployee(objectId) {
    // 自分自身は削除禁止とする
    var currentUser = ncmb.User.getCurrentUser();
    if(objectId === currentUser.get('objectId')) {
        alert('このユーザーは削除できません');
        return;
    }

    // 削除確認ダイアログ
    ons.notification.confirm('削除してよろしいですか？')
    .then(function(result) {
        if(result !== 1) return;

        /***** STEP(4) ユーザー削除 *****/
        ncmb.User.fetchById(objectId)
          .then(function(user){
              //削除実行
              user.delete()
                  .then(function(){
                    alert('削除しました');
                    var navi = document.querySelector('#navi');
                    //１つ前のページをページスタックから除去
                    navi.removePage(navi.pages.length-2);
                    navi.popPage();
                  })
                  .catch(function(error){
                    alert(JSON.stringify(error));
                  });
          })
          .catch(function(error){
            alert(JSON.stringify(error));
          });


        /***** STEP(4) ここまで *****/
    });
}

// 社員情報編集
function updateEmployee(objectId) {
    var page = document.querySelector('#navi').topPage;
    var employee_no = page.querySelector('[name=employee_no]').value;
    var employee_name = page.querySelector('[name=employee_name]').value;
    var employee_pw = page.querySelector('[name=employee_pw]').value;

    // 登録済みのユーザー情報を取得して、入力値で更新する
    ncmb.User.fetchById(objectId)
        .then(function(user) {
            user.set('userName', employee_name)
                .set('password', employee_pw)
                .set('employeeNo', employee_no)
                .update()
                .then(function(){
                    alert('更新しました');
                    document.querySelector('#navi').popPage();
                })
                .catch(function(error){
                    alert(JSON.stringify(error));
                });
        })
        .catch(function(error) {
            alert(JSON.stringify(error));
        });
}

// 出勤ボタン押下時
function saveStartTime() {
    var page = document.querySelector('#navi').topPage;
    var date = new Date();
    
    /***** STEP(5) 出退勤データ登録 *****/
    //出退勤データをメモリ上に作成
    var TimeCard = ncmb.DataStore('TimeCard')
    var timeCard = new TimeCard();
    var acl = setTimeCardAcl();
    timeCard.set('startTime',date)
      .set('acl', acl);

    //リレーションの参照先といて出退勤データを設定
    var relation = new ncmb.Relation();
    relation.add(timeCard);

    //ログイン中のユーザーに出退勤データを関連付ける
    var currentUser = ncmb.User.getCurrentUser();
    currentUser.set('timeCard',relation)
        .update()
        .then(function(result){
          alert('登録しました');
        })
        .catch(function(error){
            alert(JSON.stringify(error));
        });


    /***** STEP(5) ここまで *****/

    var start_time = zeroPad(date.getHours()) + ':' + zeroPad(date.getMinutes());
    page.querySelector('[name="start_time"]').textContent = start_time;
    page.querySelector('#start_btn').disabled = true;
    document.querySelector('#end_btn').disabled = false;
}

// 退勤ボタン押下時
function saveEndTime() {
    var page = document.querySelector('#navi').topPage;
    var date = new Date();
    // 本日の00:00:00
    var today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    // 翌日の00:00:00
    var tomorrow = new Date(date.getFullYear(), date.getMonth(), date.getDate()+1);

    var TimeCard = ncmb.DataStore('TimeCard')
    var timeCard = new TimeCard();
    var acl = setTimeCardAcl();
    var currentUser = ncmb.User.getCurrentUser();
    
    /***** STEP(6) 出退勤データ参照・更新 *****/
    TimeCard.relatedTo(currentUser, 'timeCard')
      .greaterThanOrEqualTo('startTime', today)
      .lessThan('startTime', tomorrow)
      .fetchAll()
      .then(function(results){
        var result = results[0];
          result.set('endTime',date)
            .update()
            .then(function(){
              alert('登録しました');
            });
      })
      .catch(function(error){
        alert(JSON.stringify(error));
      });

    /***** STEP(6) ここまで *****/

    var end_time = zeroPad(date.getHours()) + ':' + zeroPad(date.getMinutes());
    page.querySelector('[name="end_time"]').textContent = end_time;
    page.querySelector('#end_btn').disabled = true;
}

// 出退勤データの権限設定
function setTimeCardAcl() {
    var acl = new ncmb.Acl();
    var currentUser = ncmb.User.getCurrentUser();
    
    acl.setUserReadAccess(currentUser, true)  // 本人の読み込みを許可
       .setUserWriteAccess(currentUser, true)  // 本人の書き込みを許可
       .setRoleReadAccess('admin', true); // adminロールの読み込みを許可
    
    return acl;
}

// 登録済みの本日分出退勤データを取得
function getTodayData() {
    var page = document.querySelector('#navi').topPage;
    var date = new Date()
    var today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var tomorrow = new Date(date.getFullYear(), date.getMonth(), date.getDate()+1);

    // 今日の日付を表示
    document.querySelector('#today_date').textContent
        = today.getFullYear() + '年'
        + (today.getMonth() + 1) + '月'
        + today.getDate() + '日'
        + '(' + '日月火水木金土'[today.getDay()] + ')';

    var TimeCard = ncmb.DataStore('TimeCard')
    var currentUser = ncmb.User.getCurrentUser();

    // 今日の出退勤データが登録済みかどうかを検索
    TimeCard
        .relatedTo(currentUser, 'timeCard')
        .greaterThanOrEqualTo('startTime', today)
        .lessThan('startTime', tomorrow)
        .fetchAll()
        .then(function(results) {
            if(results.length > 0) {
                // 開始時刻が登録されている場合の表示制御
                var result = results[0];
                var hour = new Date(result.get('startTime').iso).getHours();
                var minute = new Date(result.get('startTime').iso).getMinutes()
                var start_time = zeroPad(hour) + ':' + zeroPad(minute);
                page.querySelector('[name="start_time"]').textContent = start_time;
                document.querySelector('#start_btn').disabled = true;

                // 終了時刻が登録されている場合の表示制御
                if(result.get('endTime')) {
                    var hour = new Date(result.get('endTime').iso).getHours();
                    var minute = new Date(result.get('endTime').iso).getMinutes()
                    var end_time = zeroPad(hour) + ':' + zeroPad(minute);
                    page.querySelector('[name="end_time"]').textContent = end_time;
                    document.querySelector('#end_btn').disabled = true;
                }
            } else {
                document.querySelector('#end_btn').disabled = true;
            }
        })
        .catch(function(error) {
            alert(JSON.stringify(error));
        }); 
}

// 社員別月間出退勤データ取得
function getMonthlyRecords(objectId, date) {
    var page = document.querySelector('#navi').topPage;
    var currentMonth = new Date(date.getFullYear(), date.getMonth());
    var nextMonth = new Date(date.getFullYear(), date.getMonth()+1);

    // 当月の日付を表示
    page.querySelector('#current_month').textContent = 
        date.getFullYear() + '年' + (date.getMonth() + 1) + '月';

    // 編集ボタン押下時の処理
    page.querySelector('#edit_employee_btn').onclick = function() {
        document.querySelector('#navi').pushPage('edit_employee.html', {data: {objectId: objectId}});
    };

    // 当該ユーザーを取得
    ncmb.User.fetchById(objectId)
        .then(function(user) {
            // ツールバーにユーザー名を設定
            page.querySelector('[name="employee_name"]').textContent = user.get('userName');

            // 月別データ取得
            var TimeCard = ncmb.DataStore('TimeCard');
            TimeCard
                .relatedTo(user, 'timeCard')
                .greaterThanOrEqualTo('startTime', currentMonth)
                .lessThan('startTime', nextMonth)
                .order('startTime')
                .fetchAll()
                .then(function(results) {
                    createMonthlyRecords(results);
                });
        })
        .catch(function(error) {
            alert(JSON.stringify(error));
        });

    // 先月、翌月ボタンのイベントを再設定
    document.querySelector('#prev_btn').onclick = function() {
        getMonthlyRecords(objectId, new Date(currentMonth.getFullYear(), currentMonth.getMonth()-1));
    };
    document.querySelector('#next_btn').onclick = function() {
        getMonthlyRecords(objectId, new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1));
    };
}

// 月別出勤データテンプレート作成
function createMonthlyRecords(monthlyData) {
    var list = document.querySelector('#monthly_records_list');
    list.textContent = '';
    // 当月分データを1日分ずつ処理する
    monthlyData.forEach(function(data) {
        // 1日分のデータを分解・整形
        var startTime = new Date(data.get('startTime').iso);
        var startHour = startTime.getHours();
        var startMinute = startTime.getMinutes();
        var day = startTime.getDate();
        var endTime, endHour = '--', endMinute = '--';
        if(data.get('endTime')) {
            endTime = new Date(data.get('endTime').iso);
            endHour = endTime.getHours();
            endMinute = endTime.getMinutes();
        }

        // リストに1行追加
        var template = 
            '<ons-list-item modifier="longdivider">' +
                '<ons-row>' +
                '<ons-col name="day" width="80px">' + day + '日</ons-col>' +
                '<ons-col name="time">' + zeroPad(startHour) + ' : ' + zeroPad(startMinute) + '　～　' + zeroPad(endHour) + ' : ' + zeroPad(endMinute) + '</ons-col>' +
                '</ons-row>' +
            '</ons-list-item>';
        ons.createElement(template, {append:list});
    });
}

// ゼロフォーマット
function zeroPad(num){
    return ('0' + num).slice(-2);
}
