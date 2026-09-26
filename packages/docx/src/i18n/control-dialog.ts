const zhCN = {
  more: '更多设置', name: '控件名称',
  nameHelp: '用于标识控件，不会显示为正文标题；可留空。',
  placeholderHelp: '未填写时显示的提示，不是默认值；留空使用默认提示。',
  requiredHelp: '提交填写值时检查是否为空，不会在保存或导出前自动检查。',
  checkboxRequiredHelp: '未勾选也是有效值，必填不等于必须勾选。',
  readOnlyHelp: '禁止修改内容，不限制删除。当前无初始值，开启会锁定未填写的控件。',
  delimiterHelp: '多项文字之间的分隔符，默认为逗号；留空则直接连接。',
  precision: '数字步进位数', precisionHelp: '0 表示步长 1，2 表示 0.01；不自动四舍五入。',
  heading: '插入{kind}', insert: '插入控件',
  label: '选项文字', optionsHelp: '填写正文中显示的选项文字，保存值自动生成。',
  optionExample: '例如：普通', defaultOption: '选项{index}',
  checkboxLabel: '显示文字', checkboxExample: '例如：已确认',
  checkboxHelp: '显示在方框右侧；留空时只显示方框。',
  maxLength: '字数限制', unlimited: '不限制', maxLengthHelp: '默认不限制。填 20 表示最多输入 20 个字符。',
  min: '最小值', max: '最大值', rangeHelp: '默认不限制范围，可按需填写上下限。',
  dateHelp: '选择只填写日期，或同时填写日期和时间。',
  optionsRequired: '请至少添加一个选项。',
  optionIncomplete: '请填写第 {index} 项的文字。',
  invalidRange: '最小值不能大于最大值。',
  descriptions: {
    text: '插入后点击填写文本。',
    number: '插入后点击填写数字。',
    date: '插入后点击选择日期。',
    select: '下拉选择一项，正文显示所选文字。',
    multiSelect: '下拉勾选多项，确认后显示所选文字。',
    checkbox: '点击方框切换勾选状态。',
    radioGroup: '所有选项直接显示在正文中，只能选一项。'
  },
  placeholders: { text: '请输入文本', number: '请输入数字', date: '请选择日期', select: '请选择', multiSelect: '请选择（可多选）' }
}

type DialogMessages = { [K in keyof typeof zhCN]: typeof zhCN[K] extends string ? string : { [P in keyof typeof zhCN[K]]: string } }

const enUS: DialogMessages = {
  more: 'More Settings', name: 'Control name',
  nameHelp: 'Optional identifier, not a heading in the document.',
  placeholderHelp: 'Hint while empty, not a default value. Leave blank for the standard hint.',
  requiredHelp: 'Checks for empty values on entry, not automatically on save or export.',
  checkboxRequiredHelp: 'Unchecked is also valid. Required does not mean it must be checked.',
  readOnlyHelp: 'Blocks content changes, not deletion. No initial value is set, so this locks an unfilled control.',
  delimiterHelp: 'Text between selections. Defaults to a comma; blank joins them directly.',
  precision: 'Step decimal places', precisionHelp: '0 gives a step of 1; 2 gives 0.01. Values are not rounded.',
  heading: 'Insert {kind}', insert: 'Insert Control',
  label: 'Option text', optionsHelp: 'Enter the text shown in the document. Stored values are generated automatically.',
  optionExample: 'e.g. Normal', defaultOption: 'Option {index}',
  checkboxLabel: 'Display text', checkboxExample: 'e.g. Confirmed',
  checkboxHelp: 'Shown beside the box. Leave blank for a box without text.',
  maxLength: 'Character limit', unlimited: 'No limit', maxLengthHelp: 'Unlimited by default. Enter 20 to allow up to 20 characters.',
  min: 'Minimum', max: 'Maximum', rangeHelp: 'Unrestricted by default. Set either bound as needed.',
  dateHelp: 'Choose a date only, or a date and time.',
  optionsRequired: 'Add at least one option.',
  optionIncomplete: 'Enter text for option {index}.',
  invalidRange: 'The minimum cannot exceed the maximum.',
  descriptions: {
    text: 'Click the inserted control to enter text.',
    number: 'Click the inserted control to enter a number.',
    date: 'Click the inserted control to choose a date.',
    select: 'Choose one item from a dropdown. Its text appears in the document.',
    multiSelect: 'Select multiple items and confirm to display their text.',
    checkbox: 'Click the box to toggle its checked state.',
    radioGroup: 'All options appear in the document. Only one can be selected.'
  },
  placeholders: { text: 'Enter text', number: 'Enter a number', date: 'Choose a date', select: 'Choose an option', multiSelect: 'Choose one or more options' }
}

const zhTW: DialogMessages = {
  more: '更多設定', name: '控件名稱',
  nameHelp: '用於識別控件，不會顯示為內文標題；可留空。',
  placeholderHelp: '未填寫時顯示的提示，不是預設值；留空使用預設提示。',
  requiredHelp: '提交填寫值時檢查是否為空，不會在儲存或匯出前自動檢查。',
  checkboxRequiredHelp: '未勾選也是有效值，必填不等於必須勾選。',
  readOnlyHelp: '禁止修改內容，不限制刪除。目前無初始值，開啟會鎖定未填寫的控件。',
  delimiterHelp: '多項文字之間的分隔符，預設為逗號；留空則直接連接。',
  precision: '數字步進位數', precisionHelp: '0 表示步長 1，2 表示 0.01；不自動四捨五入。',
  heading: '插入{kind}', insert: '插入控件',
  label: '選項文字', optionsHelp: '填寫內文中顯示的選項文字，儲存值自動產生。',
  optionExample: '例如：普通', defaultOption: '選項{index}',
  checkboxLabel: '顯示文字', checkboxExample: '例如：已確認',
  checkboxHelp: '顯示在方框右側；留空時只顯示方框。',
  maxLength: '字數限制', unlimited: '不限制', maxLengthHelp: '預設不限制。填 20 表示最多輸入 20 個字元。',
  min: '最小值', max: '最大值', rangeHelp: '預設不限制範圍，可按需填寫上下限。',
  dateHelp: '選擇只填寫日期，或同時填寫日期和時間。',
  optionsRequired: '請至少新增一個選項。',
  optionIncomplete: '請填寫第 {index} 項的文字。',
  invalidRange: '最小值不能大於最大值。',
  descriptions: {
    text: '插入後點擊填寫文字。',
    number: '插入後點擊填寫數字。',
    date: '插入後點擊選擇日期。',
    select: '下拉選擇一項，內文顯示所選文字。',
    multiSelect: '下拉勾選多項，確認後顯示所選文字。',
    checkbox: '點擊方框切換勾選狀態。',
    radioGroup: '所有選項直接顯示在內文中，只能選一項。'
  },
  placeholders: { text: '請輸入文字', number: '請輸入數字', date: '請選擇日期', select: '請選擇', multiSelect: '請選擇（可多選）' }
}

const jaJP: DialogMessages = {
  more: 'その他の設定', name: 'コントロール名',
  nameHelp: '識別用の任意の名前です。本文の見出しにはなりません。',
  placeholderHelp: '未入力時のヒントで、初期値ではありません。空欄なら標準のヒントを使います。',
  requiredHelp: '入力確定時に空欄を検査します。保存やエクスポート時の自動検査は行いません。',
  checkboxRequiredHelp: '未選択も有効です。必須でもチェック必須にはなりません。',
  readOnlyHelp: '内容変更を禁止しますが、削除は可能です。初期値がないため未入力のまま固定されます。',
  delimiterHelp: '選択項目間の文字です。既定はコンマ、空欄なら直接連結します。',
  precision: '増減幅の小数桁', precisionHelp: '0 は増減幅 1、2 は 0.01 です。丸めは行いません。',
  heading: '{kind}を挿入', insert: '挿入',
  label: '選択肢の文字', optionsHelp: '本文に表示する文字を入力します。保存値は自動生成されます。',
  optionExample: '例：通常', defaultOption: '選択肢{index}',
  checkboxLabel: '表示文字', checkboxExample: '例：確認済み',
  checkboxHelp: 'ボックスの右に表示します。空欄ならボックスのみです。',
  maxLength: '文字数制限', unlimited: '制限なし', maxLengthHelp: '既定は制限なし。20 と入力すると最大20文字です。',
  min: '最小値', max: '最大値', rangeHelp: '既定は制限なし。必要に応じて上下限を設定します。',
  dateHelp: '日付のみ、または日付と時刻を選びます。',
  optionsRequired: '選択肢を1つ以上追加してください。',
  optionIncomplete: '選択肢 {index} の文字を入力してください。',
  invalidRange: '最小値は最大値以下にしてください。',
  descriptions: {
    text: '挿入後にクリックして文字を入力します。',
    number: '挿入後にクリックして数値を入力します。',
    date: '挿入後にクリックして日付を選びます。',
    select: 'リストから1項目を選び、その文字を本文に表示します。',
    multiSelect: '複数選択して確定すると、選んだ文字を表示します。',
    checkbox: 'クリックしてチェック状態を切り替えます。',
    radioGroup: '本文に全選択肢を表示し、1項目だけ選択できます。'
  },
  placeholders: { text: '文字を入力', number: '数値を入力', date: '日付を選択', select: '選択してください', multiSelect: '選択してください（複数可）' }
}

const koKR: DialogMessages = {
  more: '추가 설정', name: '컨트롤 이름',
  nameHelp: '선택 사항인 식별 이름이며 본문 제목으로 표시되지 않습니다.',
  placeholderHelp: '비어 있을 때 표시할 안내이며 기본값이 아닙니다. 비워 두면 기본 안내를 사용합니다.',
  requiredHelp: '입력 확정 시 빈 값을 검사합니다. 저장이나 내보내기 시 자동 검사하지 않습니다.',
  checkboxRequiredHelp: '선택하지 않음도 유효합니다. 필수라고 반드시 체크해야 하는 것은 아닙니다.',
  readOnlyHelp: '내용 변경만 막고 삭제는 허용합니다. 초기값이 없어 빈 컨트롤이 잠깁니다.',
  delimiterHelp: '선택 항목 사이의 문자입니다. 기본은 쉼표이며 비우면 바로 연결합니다.',
  precision: '증감 단위 소수 자릿수', precisionHelp: '0은 단위 1, 2는 0.01입니다. 자동 반올림하지 않습니다.',
  heading: '{kind} 삽입', insert: '컨트롤 삽입',
  label: '옵션 텍스트', optionsHelp: '본문에 표시할 텍스트만 입력하세요. 저장값은 자동 생성됩니다.',
  optionExample: '예: 보통', defaultOption: '옵션 {index}',
  checkboxLabel: '표시 텍스트', checkboxExample: '예: 확인됨',
  checkboxHelp: '상자 오른쪽에 표시됩니다. 비워 두면 상자만 표시됩니다.',
  maxLength: '문자 수 제한', unlimited: '제한 없음', maxLengthHelp: '기본값은 제한 없음입니다. 20을 입력하면 최대 20자입니다.',
  min: '최솟값', max: '최댓값', rangeHelp: '기본값은 제한 없음입니다. 필요하면 범위를 입력하세요.',
  dateHelp: '날짜만 또는 날짜와 시간을 선택하세요.',
  optionsRequired: '옵션을 하나 이상 추가하세요.',
  optionIncomplete: '옵션 {index}의 텍스트를 입력하세요.',
  invalidRange: '최솟값은 최댓값보다 클 수 없습니다.',
  descriptions: {
    text: '삽입 후 클릭하여 텍스트를 입력하세요.',
    number: '삽입 후 클릭하여 숫자를 입력하세요.',
    date: '삽입 후 클릭하여 날짜를 선택하세요.',
    select: '목록에서 하나를 선택하면 본문에 해당 텍스트가 표시됩니다.',
    multiSelect: '여러 항목을 선택하고 확인하면 선택한 텍스트가 표시됩니다.',
    checkbox: '상자를 클릭하여 선택 상태를 전환하세요.',
    radioGroup: '본문에 모든 옵션을 표시하며 하나만 선택할 수 있습니다.'
  },
  placeholders: { text: '텍스트 입력', number: '숫자 입력', date: '날짜 선택', select: '선택하세요', multiSelect: '선택하세요 (복수 가능)' }
}

export const controlDialogMessages = { zhCN, zhTW, enUS, jaJP, koKR }
