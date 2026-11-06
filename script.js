function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(function() {
    alert("복사되었습니다:\n" + text);
  }, function() {
    alert("복사에 실패했습니다.");
  });
}
