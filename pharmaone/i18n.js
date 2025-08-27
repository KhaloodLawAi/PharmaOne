(function () {
  const translations = {
    en: {
      'nav.dashboard': 'Dashboard',
      'nav.reporting': 'Reporting',
      'nav.accounting': 'Accounting',
      'nav.tenders': 'Tenders',
      'nav.insights': 'Insights',
      'nav.regulation': 'Regulation & Promo',
      'nav.roadmap': 'Roadmap',
      'btn.theme': 'Theme',
      'btn.lang': 'عربي',
      'dashboard.title': 'Dashboard',
      'dashboard.recent': 'Recent Activity',
      'dashboard.loadSamples': 'Load sample data',
      'reporting.title': 'Reporting',
      'reporting.upload': 'Upload CSV',
      'reporting.sample': 'Load sample sales.csv',
      'reporting.export': 'Export',
      'reporting.exportPdf': 'Export PDF',
      'reporting.exportCsv': 'Export CSV',
      'reporting.empty': 'No data loaded.',
      'reporting.kpi.sales': 'Total Sales',
      'reporting.kpi.qty': 'Total Quantity',
      'reporting.kpi.orders': 'Order Count',
      'reporting.kpi.regions': 'Regions',
      'accounting.title': 'Accounting ROI',
      'accounting.uploadInvoices': 'Upload invoices.csv',
      'accounting.uploadCampaigns': 'Upload campaigns.csv',
      'accounting.sample': 'Load sample invoices + campaigns',
      'accounting.matches': 'Matches',
      'accounting.empty': 'No matches yet.',
      'accounting.export': 'Export CSV',
      'tenders.title': 'Tender Analyzer (Lite)',
      'tenders.upload': 'Upload PDF or paste text',
      'tenders.sample': 'Load sample tender text',
      'tenders.summary': 'Summary',
      'tenders.download': 'Download JSON',
      'reg.title': 'Regulation Copilot & Promo Checker',
      'reg.ask': 'Ask a compliance question',
      'reg.checkPromo': 'Check promo claim against SPCs',
      'reg.search': 'Search',
      'reg.citations': 'Citations',
      'insights.title': 'Macro Market Insights (Public)',
      'roadmap.title': 'Roadmap (Partner Data Required)',
      'roadmap.coming': 'Coming Soon — Partner Data Required',
      'common.unknown': "I don't know. Suggested sources:",
      'common.download': 'Download',
    },
    ar: {
      'nav.dashboard': 'لوحة التحكم',
      'nav.reporting': 'التقارير',
      'nav.accounting': 'المحاسبة',
      'nav.tenders': 'العطاءات',
      'nav.insights': 'التحليلات',
      'nav.regulation': 'التشريعات والإعلان',
      'nav.roadmap': 'خارطة الطريق',
      'btn.theme': 'السمة',
      'btn.lang': 'English',
      'dashboard.title': 'لوحة التحكم',
      'dashboard.recent': 'آخر النشاطات',
      'dashboard.loadSamples': 'تحميل بيانات نموذجية',
      'reporting.title': 'التقارير',
      'reporting.upload': 'رفع ملف CSV',
      'reporting.sample': 'تحميل sales.csv تجريبي',
      'reporting.export': 'تصدير',
      'reporting.exportPdf': 'تصدير PDF',
      'reporting.exportCsv': 'تصدير CSV',
      'reporting.empty': 'لا توجد بيانات.',
      'reporting.kpi.sales': 'إجمالي المبيعات',
      'reporting.kpi.qty': 'إجمالي الكمية',
      'reporting.kpi.orders': 'عدد الطلبات',
      'reporting.kpi.regions': 'المناطق',
      'accounting.title': 'عائد الاستثمار بالمحاسبة',
      'accounting.uploadInvoices': 'رفع invoices.csv',
      'accounting.uploadCampaigns': 'رفع campaigns.csv',
      'accounting.sample': 'تحميل فواتير + حملات تجريبية',
      'accounting.matches': 'التطابقات',
      'accounting.empty': 'لا توجد تطابقات بعد.',
      'accounting.export': 'تصدير CSV',
      'tenders.title': 'محلل العطاءات (نسخة مبسطة)',
      'tenders.upload': 'ارفع PDF أو الصق النص',
      'tenders.sample': 'تحميل نص عطاء تجريبي',
      'tenders.summary': 'ملخص',
      'tenders.download': 'تنزيل JSON',
      'reg.title': 'مساعد التشريعات وفحص الإعلانات',
      'reg.ask': 'اسأل سؤال امتثال',
      'reg.checkPromo': 'تحقق من ادّعاء الإعلان مقابل نشرة الدواء',
      'reg.search': 'بحث',
      'reg.citations': 'المراجع',
      'insights.title': 'رؤى السوق الكلية (عام)',
      'roadmap.title': 'خارطة الطريق (تتطلب بيانات شركاء)',
      'roadmap.coming': 'قريبًا — يتطلب بيانات شركاء',
      'common.unknown': 'لا أعرف. مصادر مقترحة:',
      'common.download': 'تنزيل',
    },
  };

  const I18N = {
    current: localStorage.getItem('pharmaone-lang') || 'en',
    t(key) {
      return translations[this.current]?.[key] || key;
    },
    setLang(lang) {
      this.current = lang;
      localStorage.setItem('pharmaone-lang', lang);
      document.documentElement.setAttribute('lang', lang);
      document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.classList.toggle('light', localStorage.getItem('pharmaone-theme') === 'light');
      this.translatePage();
    },
    translatePage() {
      document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        el.textContent = I18N.t(key);
      });
      const title = document.getElementById('page-title');
      if (title) title.textContent = window.currentPageTitle || 'PharmaOne';
    },
  };

  window.I18N = I18N;
})();

