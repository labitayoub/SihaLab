import Swal from 'sweetalert2';

const ToastMixin = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.style.zIndex = '99999';
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

export const toast = {
  success: (msg: string) => ToastMixin.fire({ icon: 'success', title: msg }),
  error: (msg: string) => ToastMixin.fire({ icon: 'error', title: msg }),
  info: (msg: string) => ToastMixin.fire({ icon: 'info', title: msg }),
  warning: (msg: string) => ToastMixin.fire({ icon: 'warning', title: msg }),
};

/** Confirmation dialog (replaces window.confirm) */
export const confirm = async (options: {
  title: string;
  text?: string;
  icon?: 'warning' | 'error' | 'question' | 'info';
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
}): Promise<boolean> => {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    icon: options.icon ?? 'warning',
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'Confirmer',
    cancelButtonText: options.cancelText ?? 'Annuler',
    confirmButtonColor: options.confirmColor ?? '#00afcc',
    cancelButtonColor: '#94a3b8',
    reverseButtons: true,
    // borderRadius is not a valid property in SweetAlertOptions
    customClass: {
      popup: 'swal2-confirm-popup',
      confirmButton: 'swal2-confirm-btn',
      cancelButton: 'swal2-cancel-btn',
    },
  });
  return result.isConfirmed;
};
