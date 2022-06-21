if (!String.prototype.insert) {
    String.prototype.insert = function (dist, index) {
        if (index < 0) index = this.length + index;
        return this.slice(0, index) + dist + this.slice(index);
    }
}

var sourceSelection = false, subSelection = false, distSelection = false;

$(document).on('click', "#selectSource", async () => {
    console.log("click")
    const filePath = await window.ipc.openVideo();
    if (filePath !== false) {
        $("#sourceField").val(filePath.replaceAll('\\', '/'));
        $("#distField").val(filePath.replaceAll('\\', '/').insert("_rip", -4))
        sourceSelection = distSelection = true;
    }
})
$(document).on('click', "#selectSub", async () => {
    const filePath = await window.ipc.openSub();
    if (filePath !== false) {
        $("#subField").val(filePath.replaceAll('\\', '/'));
        subSelection = true;
    }
})
$(document).on('click', "#renderStart", async () => {
    if (sourceSelection === false || subSelection === false || distSelection === false) {
        console.log("cannot start");
        window.ipc.openAlert(await window.ipc.i18nQuery("#alert.title.selectFilesBeforeRender"), await window.ipc.i18nQuery("#alert.description.selectFilesBeforeRender"));
        return;
    }
    $("#renderOutput").removeAttr('hidden');
    window.ipc.renderSub($("#sourceField").val(), $("#subField").val(), $("#distField").val(), {});
})
$(document).on('click', "#selectSaveAs", async () => {
    const filePath = await window.ipc.saveOutput($("#sourceField").val().slice(-3));
    if (filePath !== false) {
        $("#distField").val(filePath.replaceAll('\\', '/'));
        distSelection = true;
    }
})