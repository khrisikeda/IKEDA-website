document.addEventListener('DOMContentLoaded', async () => {
  // Ensure any legacy banner is removed if present
  const existingBanner = document.getElementById('rfq-review-banner');
  if (existingBanner) existingBanner.remove();

  // Globally accessible populate function for on-page AI chat integration
  window.populateContactFormWithRfq = function(rfq) {
    if (!rfq) return;
    const messageArea = document.getElementById('message');
    const deptSelect = document.getElementById('department');

    if (messageArea && rfq.formattedMessage) {
      messageArea.value = rfq.formattedMessage;
    }

    if (deptSelect && rfq.department) {
      let found = false;
      for (let i = 0; i < deptSelect.options.length; i++) {
        if (deptSelect.options[i].value.toLowerCase() === rfq.department.toLowerCase() ||
            deptSelect.options[i].text.toLowerCase().includes(rfq.department.toLowerCase()) ||
            rfq.department.toLowerCase().includes(deptSelect.options[i].value.toLowerCase())) {
          deptSelect.selectedIndex = i;
          found = true;
          break;
        }
      }
      if (!found) {
        const newOption = new Option(rfq.department, rfq.department, true, true);
        deptSelect.add(newOption);
      }
    }

    const formEl = document.getElementById('contact-form');
    if (formEl) {
      setTimeout(() => {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    }
  };

  // Check URL query parameters for pre-selected department and pre-filled inquiry list
  const urlParams = new URLSearchParams(window.location.search);
  const requestedDept = urlParams.get('dept');
  const requestedProduct = urlParams.get('product');
  const requestedMessage = urlParams.get('message');
  const requestedItems = urlParams.get('items');
  const requestedSubject = urlParams.get('subject');
  const messageArea = document.getElementById('message');

  // Check if there is a pending AI RFQ payload in sessionStorage
  const storedRfqRaw = sessionStorage.getItem('ikeda_rfq_payload');
  if (storedRfqRaw) {
    try {
      const storedRfq = JSON.parse(storedRfqRaw);
      window.populateContactFormWithRfq(storedRfq);
    } catch (e) {
      console.error('Failed to parse stored RFQ payload:', e);
    }
  } else if (messageArea && (requestedMessage || requestedItems || requestedProduct || requestedSubject)) {
    if (requestedMessage) {
      messageArea.value = requestedMessage;
    } else if (requestedItems) {
      messageArea.value = `Hello IKEDA Team,\n\nI would like to request an official proforma quotation for the following equipment list:\n\n${requestedItems}\n\nPlease include technical datasheets, warranty, delivery lead time, and installation in Rwanda.`;
    } else if (requestedProduct) {
      messageArea.value = `Hello, I would like to request an official quotation, specification sheet, and delivery timeframe for ${requestedProduct}.`;
    } else if (requestedSubject) {
      messageArea.value = `Hello IKEDA Team,\n\nI would like to inquire about: ${requestedSubject}.\n\nPlease provide formal quotation and equipment options.`;
    }
  }

  const deptSelect = document.getElementById('department');
  if (deptSelect && requestedDept && !storedRfqRaw) {
    let found = false;
    for (let i = 0; i < deptSelect.options.length; i++) {
      if (deptSelect.options[i].value.toLowerCase() === requestedDept.toLowerCase() ||
          deptSelect.options[i].text.toLowerCase().includes(requestedDept.toLowerCase())) {
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

  if ((requestedMessage || requestedItems || requestedProduct || requestedSubject) && !storedRfqRaw) {
    const formEl = document.getElementById('contact-form');
    if (formEl) {
      setTimeout(() => {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
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

    const btnText = submitBtn ? (submitBtn.querySelector('.btn-text') || submitBtn.querySelector('span')) : null;
    if (submitBtn) {
      submitBtn.disabled = true;
      if (btnText) {
        btnText.textContent = 'Sending Quotation Request...';
      } else {
        submitBtn.textContent = 'Sending Quotation Request...';
      }
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
      sessionStorage.removeItem('ikeda_rfq_payload');
      const revBanner = document.getElementById('rfq-review-banner');
      if (revBanner) revBanner.remove();
      form.reset();
    } catch (err) {
      status.textContent = 'We encountered an error submitting your request. Please call us directly or message via WhatsApp.';
      status.className = 'form-status show err';
      console.error(err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (btnText) {
          btnText.textContent = 'Send Quotation Request';
        } else {
          submitBtn.textContent = 'Send Quotation Request';
        }
      }
    }
  });
});
