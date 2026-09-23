document.addEventListener('DOMContentLoaded', async () => {
  // Check URL query parameters for pre-selected department
  const urlParams = new URLSearchParams(window.location.search);
  const requestedDept = urlParams.get('dept');
  const deptSelect = document.getElementById('department');
  if (deptSelect && requestedDept) {
    // Add or select the option
    let found = false;
    for (let i = 0; i < deptSelect.options.length; i++) {
      if (deptSelect.options[i].value.toLowerCase() === requestedDept.toLowerCase()) {
        deptSelect.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found) {
      const newOption = new Option(requestedDept, requestedDept, true, true);
      deptSelect.add(newOption);
    }
  }

  // Populate company details dynamically
  try {
    const company = await fetchJSON('/api/company');

    // Phone
    document.querySelectorAll('[data-company="phone"]').forEach((el) => {
      el.textContent = company.phone || '+250 795 360 359';
      if (el.tagName === 'A') el.href = `tel:${(company.phone || '0795360359').replace(/[^0-9+]/g, '')}`;
    });

    // Email
    document.querySelectorAll('[data-company="email"]').forEach((el) => {
      el.textContent = company.email || 'ikedasurgery@gmail.com';
      if (el.tagName === 'A') el.href = `mailto:${company.email || 'ikedasurgery@gmail.com'}`;
    });

    // Address
    document.querySelectorAll('[data-company="address"]').forEach((el) => {
      el.textContent = company.address || 'Kigali, Kicukiro, Masaka, Cyimo, Kabeza — Rwanda';
    });

    // Working Hours
    document.querySelectorAll('[data-company="hours"]').forEach((el) => {
      el.textContent = company.workingHours || 'Mon – Fri: 8:00 AM – 5:30 PM';
    });

    // Map embed
    const mapSlot = document.getElementById('map-embed');
    if (mapSlot && company.googleMapsEmbedUrl) {
      mapSlot.innerHTML = `<iframe src="${company.googleMapsEmbedUrl}" loading="lazy" allowfullscreen title="Ikeda Endoscopy Africa office location" style="border:0; width:100%; height:100%;"></iframe>`;
    }

    // Map external link
    const mapLink = document.getElementById('map-link');
    if (mapLink && company.googleMapsLinkUrl) {
      mapLink.href = company.googleMapsLinkUrl;
    }
  } catch (err) {
    console.error('Failed to load company info:', err);
  }

  // Contact form submission
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting inquiry...';
    }

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      department: form.department ? form.department.value : 'General Inquiry',
      message: form.message.value.trim(),
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit inquiry');
      }

      const result = await res.json();
      status.textContent = `Thank you, ${payload.name}! We have received your inquiry regarding ${payload.department}. Our biomedical support team will contact you shortly. Reference: ${result.id || 'Confirmed'}`;
      status.className = 'form-status show ok';
      form.reset();
    } catch (err) {
      status.textContent = 'We encountered an error submitting your request. Please call us directly or message via WhatsApp.';
      status.className = 'form-status show err';
      console.error(err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Inquiry';
      }
    }
  });
});
