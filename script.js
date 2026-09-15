const menuButton = document.getElementById("menuButton");
const closeMenu = document.getElementById("closeMenu");

const sideMenu = document.getElementById("sideMenu");
const menuOverlay = document.getElementById("menuOverlay");


// MENÜ MEGNYITÁSA

menuButton.addEventListener("click", function () {

    sideMenu.classList.add("open");
    menuOverlay.classList.add("open");

});


// MENÜ BEZÁRÁSA

closeMenu.addEventListener("click", function () {

    sideMenu.classList.remove("open");
    menuOverlay.classList.remove("open");

});


// HÁTTÉRRE KATTINTÁS

menuOverlay.addEventListener("click", function () {

    sideMenu.classList.remove("open");
    menuOverlay.classList.remove("open");

});
