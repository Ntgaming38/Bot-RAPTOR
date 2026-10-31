// Tín hiệu khởi động lại trong cùng tiến trình: dashboard ghi yêu cầu,
// vòng kiểm tra trong index.js đọc và thoát tiến trình để Botkeep tự chạy lại.
let requested = false;
function request() { requested = true; }
function consume() {
  const r = requested;
  requested = false;
  return r;
}
module.exports = { request, consume };
