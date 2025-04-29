function openModal(modalId) {
    const modalContainer = document.getElementById('modal-container');
    const modalDynamic = document.getElementById('modal-dynamic');
    const modal = document.getElementById(modalId);
    modalDynamic.innerHTML = modal.innerHTML;
    modalContainer.style.display = 'block';
}

function closeModal() {
    const modalContainer = document.getElementById('modal-container');
    const modalDynamic = document.getElementById('modal-dynamic');
    modalContainer.style.display = 'none';
    modalDynamic.innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const modalContainer = document.getElementById('modal-container');
    var toggleAnimation = document.getElementById("bg-animation");
    var gridLines = document.getElementsByClassName("bg-grid-lines")[0];

    if (toggleAnimation) {
        toggleAnimation.onclick = function(e) {
            if (!gridLines.classList.contains("stop")) {
                gridLines.classList.add("stop");
            } else {
                gridLines.classList.remove("stop");
            }

            return false;
        }
    }

    document.querySelectorAll('.modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = btn.getAttribute('data-modal-id');
            openModal(modalId);
        });
    });

    if (modalContainer) {
        const closeBtn = modalContainer.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                closeModal();
            }
        });
    }

    const logo = document.querySelector('.logo');
    if (logo) {
        document.addEventListener('scroll', () => {
            if (window.scrollY > 0) {
                logo.classList.add('scrolled');
            } else {
                logo.classList.remove('scrolled');
            }
        });
    }
});