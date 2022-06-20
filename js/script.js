if (!String.prototype.insert) {
    String.prototype.insert = function (dist, index) {
        if (index < 0) index = this.length + index;
        return this.slice(0, index) + dist + this.slice(index);
    }
}

$(document).on('click', "#selectSource", async () => {
    console.log("click")
    const filePath = await window.ipc.openVideo();
    if (filePath !== false) {
        $("#sourceField").val(filePath.replaceAll('\\', '/'));
        $("#distField").val(filePath.replaceAll('\\', '/').insert("_rip", -4))
    }
})
$(document).on('click', "#selectSub", async () => {
    const filePath = await window.ipc.openSub();
    if (filePath !== false) {
        $("#subField").val(filePath.replaceAll('\\', '/'));
    }
})
$(document).on('click', "#renderStart", () => {
    $("#renderOutput").removeAttr('hidden');
    window.ipc.renderSub($("#sourceField").val(), $("#subField").val(), $("#distField").val(), {});
})
$(document).on('click', "#selectSaveAs", async () => {
    const filePath = await window.ipc.saveOutput($("#sourceField").val().slice(-3));
    if (filePath !== false) {
        $("#distField").val(filePath.replaceAll('\\', '/'));
    }
})