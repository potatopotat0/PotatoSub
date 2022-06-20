if (!String.prototype.insert) {
    String.prototype.insert = function (dist, index) {
        if (index < 0) index = this.length + index;
        return this.slice(0, index) + dist + this.slice(index);
    }
}
window.ipc.renderOutput((event, text) => {
    $("#renderOutput").append(text);
    var $textarea = $('#renderOutput');
    $textarea.scrollTop($textarea[0].scrollHeight);
})
window.ipc.renderFinished(async (event) => {
    $("#container")[0].innerHTML += `<button id="closeWindow">${await window.ipc.i18nQuery("#action.run.closeWindow")}</button>`;
})

$(document).on("click", "#closeWindow", () => {
    window.close();
})