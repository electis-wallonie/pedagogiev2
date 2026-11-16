// Traduction de l'interface : français (par défaut) ou arabe (de droite à gauche).
// L'interface est écrite en français ; en mode arabe, chaque texte affiché est traduit
// avec ce dictionnaire (et quelques règles pour les textes qui contiennent des nombres ou des noms).
// Les contenus saisis par les utilisateurs (notes, noms…) ne sont pas traduits.

const LKEY = 'suivi-lang';
export const lang = (() => { try { return localStorage.getItem(LKEY) === 'ar' ? 'ar' : 'fr'; } catch { return 'fr'; } })();
export const isAr = lang === 'ar';
export function setLang(l) { localStorage.setItem(LKEY, l); location.reload(); }
export const locale = isAr ? 'ar-u-nu-latn' : 'fr-FR';

export const SOURATES_AR = ['الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة', 'يونس', 'هود', 'يوسف', 'الرعد', 'إبراهيم', 'الحجر', 'النحل', 'الإسراء', 'الكهف', 'مريم', 'طه', 'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنكبوت', 'الروم', 'لقمان', 'السجدة', 'الأحزاب', 'سبأ', 'فاطر', 'يس', 'الصافات', 'ص', 'الزمر', 'غافر', 'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق', 'الذاريات', 'الطور', 'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة', 'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم', 'الحاقة', 'المعارج', 'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الإنسان', 'المرسلات', 'النبأ', 'النازعات', 'عبس', 'التكوير', 'الانفطار', 'المطففين', 'الانشقاق', 'البروج', 'الطارق', 'الأعلى', 'الغاشية', 'الفجر', 'البلد', 'الشمس', 'الليل', 'الضحى', 'الشرح', 'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات', 'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر', 'المسد', 'الإخلاص', 'الفلق', 'الناس'];

const AR = {
  // général
  'Suivi': 'المتابعة', 'Accueil': 'الرئيسية', 'Classes': 'الأقسام', 'Classe': 'القسم', 'Élèves': 'التلاميذ', 'Élève': 'تلميذ', 'élèves': 'تلاميذ', 'élève(s)': 'تلميذ',
  'Réglages': 'الإعدادات', 'Direction': 'الإدارة', 'Administration': 'الإدارة', 'Administrateur': 'المدير', 'Admin': 'المدير', 'Enseignant': 'أستاذ', 'Prof': 'أستاذ',
  'Professeur': 'الأستاذ', 'Professeurs': 'الأساتذة', 'professeurs': 'أساتذة', 'classes': 'أقسام', 'classe(s)': 'قسم', 'Navigation': 'التنقل', 'Sections': 'الأقسام',
  'Retour': 'رجوع', 'Fermer': 'إغلاق', 'Annuler': 'إلغاء', 'Enregistrer': 'حفظ', 'Modifier': 'تعديل', 'Supprimer': 'حذف', 'Ajouter': 'إضافة', 'Copier': 'نسخ',
  'Envoyer': 'إرسال', 'Publier': 'نشر', 'Vocal': 'رسالة صوتية', 'Arrêter': 'إيقاف', 'Refaire': 'إعادة', 'Utiliser': 'استعمال', 'Tout voir': 'عرض الكل', 'OK': 'جاهز',
  'Rechercher': 'بحث', 'Rechercher un élève…': 'ابحث عن تلميذ…', 'Rechercher un élève': 'ابحث عن تلميذ', 'Note': 'ملاحظة', 'Message': 'الرسالة', 'nouvelle': 'جديد',
  'Démo': 'نسخة تجريبية', 'les données restent sur cet appareil': 'تبقى البيانات على هذا الجهاز', 'Comptes de test': 'حسابات التجربة',
  'Lecture seule': 'للاطلاع فقط', 'Langue : français / العربية': 'اللغة : Français / العربية', 'Langue': 'اللغة', 'Français': 'Français',
  'Cette application a besoin de JavaScript.': 'يحتاج هذا التطبيق إلى JavaScript.', 'Chargement…': 'جارٍ التحميل…',
  // jours, couleurs
  'Dimanche': 'الأحد', 'Lundi': 'الإثنين', 'Mardi': 'الثلاثاء', 'Mercredi': 'الأربعاء', 'Jeudi': 'الخميس', 'Vendredi': 'الجمعة', 'Samedi': 'السبت',
  'DIMANCHE': 'الأحد', 'LUNDI': 'الإثنين', 'MARDI': 'الثلاثاء', 'MERCREDI': 'الأربعاء', 'JEUDI': 'الخميس', 'VENDREDI': 'الجمعة', 'SAMEDI': 'السبت',
  'AUJOURD’HUI': 'اليوم', 'DEMAIN': 'غداً', 'Bleu': 'أزرق', 'Menthe': 'أخضر', 'Jaune': 'أصفر', 'Rose': 'وردي',
  // accueil parent
  'Où en est': 'أين وصل', 'mon enfant ?': 'ابني / ابنتي؟', 'Espace prof': 'فضاء الأستاذ', 'Code de suivi': 'رمز المتابعة',
  'Tapez le code donné par l’enseignant. Pas de compte, pas de mot de passe.': 'اكتب الرمز الذي أعطاك إياه الأستاذ. لا حساب ولا كلمة سر.',
  'Se souvenir de ce code sur cet appareil': 'تذكّر هذا الرمز على هذا الجهاز', 'Voir la fiche': 'عرض البطاقة', 'Mes fiches': 'بطاقاتي',
  'Oublier ces fiches sur cet appareil': 'نسيان هذه البطاقات على هذا الجهاز', 'Fiches oubliées sur cet appareil': 'تم نسيان البطاقات على هذا الجهاز',
  'Installer l’app sur mon téléphone': 'تثبيت التطبيق على هاتفي', 'ex. CL2-YIB-KARIM-03052016-AB12': 'مثال : CL2-YIB-KARIM-10ANS-AB12',
  'Aucune fiche ne correspond à ce code. Vérifiez les tirets et les chiffres, ou demandez le code à l’enseignant.': 'لا توجد بطاقة بهذا الرمز. تحقّق من الشرطات والأرقام، أو اطلب الرمز من الأستاذ.',
  'Installer Suivi': 'تثبيت التطبيق', 'Installer maintenant': 'التثبيت الآن', 'Ouvrez le menu': 'افتح القائمة', 'Bouton Partager sur iPhone, ou ⋮ sur Android': 'زر المشاركة على iPhone، أو ⋮ على Android',
  'Choisissez': 'اختر', '« Sur l’écran d’accueil » / « Installer l’application »': '« إضافة إلى الشاشة الرئيسية » / « تثبيت التطبيق »', 'C’est prêt': 'كل شيء جاهز',
  'Suivi s’ouvre comme une vraie application': 'يفتح التطبيق كأي تطبيق عادي',
  // fiche
  'Aperçu': 'نظرة عامة', 'Coran': 'القرآن', 'Présence': 'الحضور', 'Notes': 'الملاحظات', 'Langue & Religion': 'اللغة والدين',
  'sourates validées': 'سور محفوظة', 'sourates': 'سور', 'objectifs': 'أهداف', 'présence': 'الحضور', 'Sourate en cours': 'السورة قيد الحفظ',
  'En cours': 'قيد الحفظ', 'Validée': 'محفوظة', 'Non connue': 'لم تُحفظ بعد', 'Début d’apprentissage': 'بداية الحفظ', 'Validée le': 'تاريخ الحفظ',
  'pas encore': 'ليس بعد', 'Dernière note de l’imam': 'آخر ملاحظة من الإمام', 'Pas encore de note.': 'لا توجد ملاحظة بعد.', 'Ouvrir': 'فتح',
  'Aucune sourate en cours pour le moment.': 'لا توجد سورة قيد الحفظ حالياً.', 'Touchez une sourate pour voir ses dates.': 'اضغط على سورة لرؤية تواريخها.',
  'Notes de l’imam': 'ملاحظات الإمام', 'Pas encore de note sur cette sourate.': 'لا توجد ملاحظة على هذه السورة بعد.',
  'Visible par l’élève et ses parents. Ces notes s’effacent quand la sourate est validée.': 'يراها التلميذ ووليّ أمره. تُحذف هذه الملاحظات عند اعتماد السورة.',
  'Ex : réviser versets 1 à 14 pour samedi…': 'مثال : مراجعة الآيات من 1 إلى 14 ليوم السبت…', 'Ce mot disparaît quand la sourate est validée.': 'تُحذف هذه الملاحظة عند اعتماد السورة.',
  'Dernier cours': 'آخر حصة', 'DERNIÈRE NOTE': 'آخر ملاحظة', 'Message vocal': 'رسالة صوتية', 'Message vocal indisponible sur cet appareil': 'الرسالة الصوتية غير متوفرة على هذا الجهاز',
  'Parent :': 'وليّ الأمر :', 'Parent': 'وليّ الأمر', 'Niveau': 'المستوى', 'Aucun objectif défini pour ce niveau.': 'لا توجد أهداف لهذا المستوى.',
  'présent': 'حاضر', 'absent prévenu': 'غائب بإشعار', 'absent': 'غائب', 'Présent': 'حاضر', 'Absent': 'غائب', 'Absent prévenu': 'غائب بإشعار', 'Prévenu': 'بإشعار',
  'Absent à ce cours': 'غائب في هذه الحصة', 'Absent · prévenu': 'غائب · بإشعار', 'Pas encore d’appel enregistré.': 'لم يُسجَّل أي حضور بعد.',
  'Notes & appréciations': 'الملاحظات والتقييمات', 'Personnelle': 'شخصية', 'Toute la classe': 'كل القسم', 'Aucune note pour le moment.': 'لا توجد ملاحظات حالياً.',
  'Appréciation, remarque, encouragement…': 'تقييم، ملاحظة، تشجيع…', 'Message de la direction': 'رسالة من الإدارة', 'Note': 'ملاحظة',
  'Supprimer la note': 'حذف الملاحظة', 'Supprimer le message vocal': 'حذف الرسالة الصوتية', 'Enregistrement…': 'جارٍ التسجيل…',
  // connexion
  'Espace enseignant': 'فضاء الأستاذ', 'Connexion': 'تسجيل الدخول', 'Identifiant': 'اسم المستخدم', 'Mot de passe': 'كلمة السر', 'Se connecter': 'دخول',
  'Identifiant ou mot de passe incorrect.': 'اسم المستخدم أو كلمة السر غير صحيحة.', 'Pas de compte ? Les comptes enseignants sont créés par l’administrateur.': 'ليس لديك حساب؟ حسابات الأساتذة يُنشئها المدير.',
  'Comptes de démonstration': 'حسابات تجريبية', 'Se déconnecter': 'تسجيل الخروج', 'Déconnexion': 'تسجيل الخروج',
  'Choisissez votre mot de passe': 'اختر كلمة السر الخاصة بك', 'Changer de mot de passe': 'تغيير كلمة السر', 'Changer mon mot de passe': 'تغيير كلمة السر',
  'Votre compte a été créé avec un mot de passe temporaire. Choisissez-en un nouveau.': 'أُنشئ حسابك بكلمة سر مؤقتة. اختر كلمة سر جديدة.',
  'Mot de passe actuel': 'كلمة السر الحالية', 'Nouveau mot de passe': 'كلمة السر الجديدة', 'Confirmer': 'تأكيد', '8 caractères minimum': '8 أحرف على الأقل',
  'Mot de passe actuel incorrect': 'كلمة السر الحالية غير صحيحة', 'Les deux mots de passe ne correspondent pas': 'كلمتا السر غير متطابقتين', 'Mot de passe enregistré': 'تم حفظ كلمة السر',
  // admin / direction
  'Vue d’ensemble': 'نظرة شاملة', 'TOUTES LES CLASSES': 'كل الأقسام', 'MES CLASSES': 'أقسامي', 'Toutes les classes': 'كل الأقسام', 'Mes classes': 'أقسامي',
  'En tant qu’administrateur, vous voyez et gérez tout : toutes les classes, tous les élèves, l’appel, le Coran, les objectifs et les notes, comme un professeur. Ici : les comptes des professeurs et les messages de la direction.':
    'بصفتك مديراً، ترى وتدير كل شيء: كل الأقسام وكل التلاميذ والحضور والقرآن والأهداف والملاحظات، مثل الأستاذ. هنا: حسابات الأساتذة ورسائل الإدارة.',
  'Affiché en haut de toutes les fiches élèves (parents) et des tableaux de bord (professeurs), entre les deux dates choisies.': 'تظهر في أعلى بطاقات كل التلاميذ (للأولياء) ولوحات الأساتذة، بين التاريخين المختارين.',
  'Visible du': 'تظهر من', 'Jusqu’au': 'إلى غاية', 'Ex : l’école sera fermée samedi prochain…': 'مثال : المدرسة مغلقة يوم السبت القادم…',
  'Aucun message pour le moment.': 'لا توجد رسائل حالياً.', 'Terminé': 'انتهت', 'À venir': 'قادمة', 'En ligne': 'معروضة', 'Supprimer le message': 'حذف الرسالة',
  'Message publié': 'تم نشر الرسالة', 'Supprimer ce message ?': 'حذف هذه الرسالة؟', 'La date de fin est avant la date de début': 'تاريخ النهاية قبل تاريخ البداية',
  'Écrivez un message ou enregistrez un vocal': 'اكتب رسالة أو سجّل رسالة صوتية', 'Nouveau professeur': 'أستاذ جديد', 'Nom affiché aux parents': 'الاسم الظاهر للأولياء',
  'ex. Imam Youssef': 'مثال : الإمام يوسف', 'Identifiant de connexion': 'اسم المستخدم للدخول', 'ex. youssef': 'مثال : youssef',
  'Lettres, chiffres, point ou tiret, 3 caractères minimum': 'حروف لاتينية أو أرقام أو نقطة أو شرطة، 3 أحرف على الأقل', 'Mot de passe temporaire': 'كلمة سر مؤقتة',
  'Générer un autre mot de passe': 'توليد كلمة سر أخرى', 'Le professeur devra le changer à sa première connexion.': 'سيغيّرها الأستاذ عند أول دخول.', 'Créer le compte': 'إنشاء الحساب',
  'Aucun professeur pour le moment.': 'لا يوجد أساتذة حالياً.', 'Mot de passe temporaire': 'كلمة سر مؤقتة', 'Compte créé': 'تم إنشاء الحساب', 'Nouveau mot de passe': 'كلمة السر الجديدة',
  'Copier le message': 'نسخ الرسالة', 'Cet identifiant existe déjà': 'اسم المستخدم هذا موجود', 'Identifiant invalide': 'اسم مستخدم غير صالح',
  'Mot de passe : 8 caractères minimum': 'كلمة السر : 8 أحرف على الأقل', 'Compte supprimé': 'تم حذف الحساب', 'Créez d’abord un professeur': 'أنشئ أستاذاً أولاً',
  'Créez d’abord un professeur.': 'أنشئ أستاذاً أولاً.', 'Identifiant :': 'اسم المستخدم :',
  // tableau de bord
  'PROCHAIN COURS': 'الحصة القادمة', 'Faire l’appel': 'تسجيل الحضور', 'Bienvenue !': 'مرحباً!', 'Créer une classe': 'إنشاء قسم',
  'Commencez par créer votre première classe, puis ajoutez vos élèves.': 'ابدأ بإنشاء قسمك الأول، ثم أضف تلاميذك.',
  'sourates validées (7 j)': 'سور محفوظة (7 أيام)', 'objectifs acquis (7 j)': 'أهداف مكتسبة (7 أيام)', 'appels faits (7 j)': 'حصص مسجّلة (7 أيام)',
  'À surveiller': 'للمتابعة', 'Rien à signaler.': 'لا شيء يُذكر.',
  // classes
  'Nouvelle classe': 'قسم جديد', 'Modifier la classe': 'تعديل القسم', 'Nom de la classe': 'اسم القسم', 'Jour': 'اليوم', 'Heure': 'الساعة', 'Couleur': 'اللون',
  'Niveau Langue & Religion par défaut': 'مستوى اللغة والدين الافتراضي', 'Créer la classe': 'إنشاء القسم', 'Supprimer la classe': 'حذف القسم',
  'Classe créée': 'تم إنشاء القسم', 'Classe enregistrée': 'تم حفظ القسم', 'Classe supprimée': 'تم حذف القسم', 'Classe introuvable': 'القسم غير موجود',
  'Historique': 'السجل', 'Note classe': 'ملاحظة للقسم', 'Notes pour toute la classe': 'ملاحظات لكل القسم', 'Ex : pas de cours samedi prochain…': 'مثال : لا حصة يوم السبت القادم…',
  'Pas encore d’élève dans cette classe.': 'لا يوجد تلاميذ في هذا القسم بعد.', 'Ajouter un élève': 'إضافة تلميذ', 'Note publiée': 'تم نشر الملاحظة', 'Note envoyée': 'تم إرسال الملاحظة',
  'Écrivez une note ou enregistrez un vocal': 'اكتب ملاحظة أو سجّل رسالة صوتية', 'Arrêtez d’abord l’enregistrement': 'أوقف التسجيل أولاً',
  'Enregistrement vocal non pris en charge par ce navigateur': 'التسجيل الصوتي غير مدعوم في هذا المتصفح', 'Micro refusé : autorisez le micro dans le navigateur': 'تم رفض الميكروفون : اسمح به في المتصفح',
  // appel
  'L’appel': 'تسجيل الحضور', 'Date du cours (enregistrée automatiquement)': 'تاريخ الحصة (يُسجَّل تلقائياً)', 'Terminer l’appel': 'إنهاء تسجيل الحضور',
  'Appel enregistré': 'تم تسجيل الحضور', 'présents': 'حاضرون', 'absents': 'غائبون', 'prévenus': 'بإشعار', 'présent(s)': 'حاضر', 'absent(s)': 'غائب', 'prévenu(s)': 'بإشعار',
  'à marquer': 'لم يُسجَّل', 'Absents ce jour': 'الغائبون اليوم', 'C’est déjà visible sur leur fiche.': 'يظهر ذلك الآن في بطاقاتهم.', 'Retour à la classe': 'العودة إلى القسم',
  'Modifier l’appel': 'تعديل الحضور', 'Historique des appels': 'سجل الحضور', 'Aucun appel pour le moment.': 'لا يوجد تسجيل حضور حالياً.',
  'Vert : présents': 'الأخضر : الحاضرون', 'Rouge : absents': 'الأحمر : الغائبون', 'Jaune : absents prévenus. Touchez une date pour corriger l’appel.': 'الأصفر : الغائبون بإشعار. اضغط على تاريخ لتصحيح الحضور.',
  // élèves
  'Nouvel élève': 'تلميذ جديد', '4 infos, le code se crée tout seul': '4 معلومات، والرمز يُنشأ تلقائياً', 'Nom': 'اللقب', 'Prénom(s)': 'الاسم (الأسماء)',
  'Tous les prénoms, séparés par un espace': 'كل الأسماء، مفصولة بمسافة', 'Âge': 'العمر', 'L’âge se met à jour tout seul chaque année.': 'يتحدّث العمر تلقائياً كل سنة.',
  'Prénom d’un parent': 'اسم وليّ الأمر', 'Date de naissance précise (facultatif)': 'تاريخ الميلاد الدقيق (اختياري)', 'Date de naissance': 'تاريخ الميلاد',
  'Si elle est remplie, l’âge est calculé à partir d’elle.': 'إذا أُدخل، يُحسب العمر انطلاقاً منه.',
  'Le code de suivi est créé automatiquement : classe, initiales, prénom du parent, âge, + 4 caractères de sécurité.': 'يُنشأ رمز المتابعة تلقائياً: القسم، الحروف الأولى، اسم وليّ الأمر، العمر، + 4 رموز أمان.',
  'Ajouter l’élève': 'إضافة التلميذ', 'Changer de classe conserve tout le suivi.': 'تغيير القسم يحتفظ بكل المتابعة.', 'Créez d’abord une classe.': 'أنشئ قسماً أولاً.',
  'Merci de remplir tous les champs': 'يرجى ملء كل الخانات', 'Élève enregistré': 'تم حفظ التلميذ', 'CODE DE SUIVI À DONNER AU PARENT': 'رمز المتابعة الذي يُعطى لوليّ الأمر',
  'Partager le lien': 'مشاركة الرابط', 'Le lien ouvre directement la fiche, sans rien taper.': 'يفتح الرابط البطاقة مباشرة دون كتابة أي شيء.',
  'Inscrire un autre élève': 'تسجيل تلميذ آخر', 'Ouvrir la fiche': 'فتح البطاقة', 'Copié !': 'تم النسخ!', 'Copier le code': 'نسخ الرمز',
  'Partager le lien de la fiche': 'مشاركة رابط البطاقة', 'Voir comme un parent': 'عرض كوليّ أمر', 'Modifier l’élève': 'تعديل التلميذ', 'Élève introuvable': 'التلميذ غير موجود',
  'En cours': 'قيد الحفظ', 'Touchez une sourate pour changer son état, ses dates ou laisser une note.': 'اضغط على سورة لتغيير حالتها أو تواريخها أو لترك ملاحظة.',
  'Date enregistrée': 'تم حفظ التاريخ', 'Début d’apprentissage : aujourd’hui': 'بداية الحفظ : اليوم', 'Régénérer le code': 'إعادة إنشاء الرمز',
  'L’ancien code ne fonctionnera plus (utile si le code a circulé).': 'لن يعمل الرمز القديم بعد الآن (مفيد إذا انتشر الرمز).', 'Supprimer l’élève et toutes ses données': 'حذف التلميذ وكل بياناته',
  'Nouveau code créé': 'تم إنشاء رمز جديد', 'Élève supprimé': 'تم حذف التلميذ', 'Créer un nouveau code ? L’ancien ne marchera plus.': 'إنشاء رمز جديد؟ لن يعمل الرمز القديم.',
  'Supprimer cette note ?': 'حذف هذه الملاحظة؟', 'Son suivi (Coran, objectifs, présences, notes) sera effacé définitivement.': 'ستُحذف متابعته (القرآن، الأهداف، الحضور، الملاحظات) نهائياً.',
  'Code de suivi': 'رمز المتابعة',
  // objectifs
  'Objectifs par niveau': 'الأهداف حسب المستوى', 'Langue & Religion · communs à toutes vos classes': 'اللغة والدين · مشتركة بين كل أقسامك', 'communs à toutes vos classes': 'مشتركة بين كل أقسامك',
  'Objectif': 'الهدف', 'Catégorie': 'الفئة', 'ex. Lire un mot avec soukoun': 'مثال : قراءة كلمة فيها سكون', 'Objectif ajouté': 'تمت إضافة الهدف',
  'Ajouter un niveau': 'إضافة مستوى', 'Niveaux': 'المستويات', 'Modifier l’objectif :': 'تعديل الهدف :', 'Aucun objectif pour ce niveau.': 'لا توجد أهداف لهذا المستوى.',
  'Supprimer cet objectif ? Il disparaîtra des fiches des élèves.': 'حذف هذا الهدف؟ سيختفي من بطاقات التلاميذ.', 'Valider': 'اعتماد', 'Retirer': 'إلغاء',
  'Langue arabe': 'اللغة العربية', 'Religion': 'الدين',
  'Reconnaître les 28 lettres': 'التعرّف على الحروف الـ28', 'Écrire les lettres isolées': 'كتابة الحروف منفصلة', 'Lire les voyelles courtes': 'قراءة الحركات القصيرة',
  'Lire des mots de 3 lettres': 'قراءة كلمات من 3 حروف', 'Lire une phrase courte': 'قراءة جملة قصيرة', 'Connaître les 5 piliers': 'معرفة أركان الإسلام الخمسة',
  'Savoir faire les ablutions': 'إتقان الوضوء', 'Invocations du quotidien': 'أذكار اليوم والليلة', 'Lire un texte voyellé': 'قراءة نص مشكول',
  'Écrire une phrase dictée': 'كتابة جملة مُملاة', 'Conjuguer au passé': 'تصريف الفعل الماضي', 'Les étapes de la prière': 'مراحل الصلاة', 'Histoire des prophètes (1)': 'قصص الأنبياء (1)',
  // réglages
  'Importer des élèves (Excel)': 'استيراد التلاميذ (Excel)', 'Objectifs Langue & Religion par niveau': 'أهداف اللغة والدين حسب المستوى',
  'DONNÉES & CONFIDENTIALITÉ': 'البيانات والخصوصية', 'Exporter mes données (fichier)': 'تصدير بياناتي (ملف)', 'Réinitialiser la démo': 'إعادة ضبط النسخة التجريبية',
  'Effacer toutes les données de cet appareil et recharger la démo ?': 'مسح كل بيانات هذا الجهاز وإعادة تحميل النسخة التجريبية؟',
  // appel : date et heure du cours
  'De quel cours s’agit-il ?': 'أيّ حصة؟', 'Date du cours': 'تاريخ الحصة', 'Heure du cours': 'ساعة الحصة', 'Cours du': 'حصة يوم',
  'Indiquez la date et l’heure du cours (pas l’heure à laquelle vous faites l’appel). C’est ce qui apparaîtra dans l’historique.': 'أدخل تاريخ الحصة وساعتها (وليس ساعة تسجيل الحضور). هذا ما سيظهر في السجل.',
  'Créneaux habituels de cette classe :': 'الحصص المعتادة لهذا القسم :', 'Commencer l’appel': 'بدء تسجيل الحضور', 'Supprimer cet appel': 'حذف هذا التسجيل',
  'Supprimer cet appel ? Il disparaîtra de l’historique des élèves.': 'حذف تسجيل الحضور هذا؟ سيختفي من سجل التلاميذ.', 'Appel supprimé': 'تم حذف تسجيل الحضور',
  'Ce cours a déjà un appel : vous pouvez le modifier': 'لهذه الحصة تسجيل حضور مسبق : يمكنك تعديله', 'Appel introuvable': 'تسجيل الحضور غير موجود',
  'Aucun appel pour l’instant': 'لا يوجد تسجيل حضور بعد', 'Nouvel élève': 'تلميذ جديد',
  'Appel de quel cours ?': 'تسجيل حضور أيّ حصة؟', '1. Date du cours': '1. تاريخ الحصة', '2. Heure du cours': '2. ساعة الحصة', 'Heures habituelles :': 'الساعات المعتادة :',
  'Choisissez la date et l’heure du cours': 'اختر تاريخ الحصة وساعتها', 'Choisir le cours': 'اختيار الحصة', 'Choisissez d’abord le cours (date et heure).': 'اختر الحصة أولاً (التاريخ والساعة).',
  'Corriger la date ou l’heure': 'تصحيح التاريخ أو الساعة', 'Indiquez le': 'أدخل', 'jour': 'يوم', 'et l’': 'و', 'heure du cours': 'ساعة الحصة', '(pas l’heure à laquelle vous faites l’appel).': '(وليس ساعة تسجيل الحضور).',
  'Objectifs classe': 'أهداف القسم', 'Objectifs de la classe': 'أهداف القسم', 'Valider pour toute la classe': 'اعتماد لكل القسم', 'Retirer pour toute la classe': 'إلغاء لكل القسم',
  'Détail par élève': 'التفاصيل حسب التلميذ', 'Objectif validé pour toute la classe': 'تم اعتماد الهدف لكل القسم', 'Niveau validé pour toute la classe': 'تم اعتماد المستوى لكل القسم',
  'Retirer cet objectif pour tous les élèves de la classe ?': 'إلغاء هذا الهدف لكل تلاميذ القسم؟',
  'Validez un objectif pour toute la classe en une fois (par exemple après une interrogation commune). Vous pouvez ensuite retirer un élève dans « Détail par élève ».': 'اعتمد هدفاً لكل القسم دفعة واحدة (مثلاً بعد اختبار جماعي). يمكنك بعد ذلك إلغاؤه لتلميذ معيّن في « التفاصيل حسب التلميذ ».',
  'L’appel a déjà été fait aujourd’hui': 'تم تسجيل الحضور اليوم مسبقاً', 'Modifier l’appel d’aujourd’hui': 'تعديل حضور اليوم',
  'Faire un 2e appel aujourd’hui': 'تسجيل حضور ثانٍ اليوم', 'Corriger la date': 'تصحيح التاريخ',
  'Téléphone du parent': 'هاتف وليّ الأمر', 'Téléphone': 'الهاتف', 'Contact du parent': 'التواصل مع وليّ الأمر', 'Visible seulement par les profs et l’admin': 'يراه الأساتذة والمدير فقط',
  'Visible seulement par les profs et l’admin (jamais sur la fiche des parents). Avec l’indicatif (+32, +33…), le bouton WhatsApp apparaît aussi.': 'يراه الأساتذة والمدير فقط (لا يظهر أبداً في بطاقة الأولياء). مع رمز الدولة (+32، +33…) يظهر زر WhatsApp أيضاً.',
  'Aucun numéro de téléphone pour ce parent.': 'لا يوجد رقم هاتف لوليّ الأمر هذا.', 'Ajouter un numéro': 'إضافة رقم', 'SMS': 'رسالة SMS', 'WhatsApp': 'WhatsApp', 'ex. +32 470 12 34 56': 'مثال : ‎+32 470 12 34 56',
  // import
  'Importer des élèves': 'استيراد التلاميذ', 'Vos classes': 'أقسامك', '1. Préparez le fichier Excel': '1. حضّر ملف Excel',
  'Une ligne par élève, avec ces colonnes (dans n’importe quel ordre) :': 'سطر لكل تلميذ، بهذه الأعمدة (بأي ترتيب) :',
  '« Âge » peut être remplacé par « Date de naissance ». Si la colonne Classe est vide ou absente, vous choisirez la classe juste après. Les classes qui n’existent pas encore peuvent être créées automatiquement.':
    'يمكن استبدال « العمر » بـ« تاريخ الميلاد ». إذا كان عمود القسم فارغاً أو غير موجود، ستختار القسم بعد ذلك. ويمكن إنشاء الأقسام غير الموجودة تلقائياً.',
  'Télécharger un modèle': 'تنزيل نموذج', '2. Choisissez le fichier': '2. اختر الملف', 'Choisir un fichier Excel ou CSV': 'اختيار ملف Excel أو CSV',
  'Formats acceptés : .xlsx (Excel) et .csv. Pour un ancien fichier .xls, ouvrez-le dans Excel et enregistrez-le en .xlsx.': 'الصيغ المقبولة : ‎.xlsx (Excel) و‎.csv. بالنسبة لملف ‎.xls قديم، افتحه في Excel واحفظه بصيغة ‎.xlsx.',
  'État': 'الحالة', 'Déjà présent': 'موجود مسبقاً', 'Importer un autre fichier': 'استيراد ملف آخر', 'Télécharger la liste des codes': 'تنزيل قائمة الرموز',
  'Chaque élève a reçu son code de suivi. Téléchargez la liste des codes pour les transmettre aux parents.': 'حصل كل تلميذ على رمز المتابعة. نزّل قائمة الرموز لإرسالها إلى الأولياء.',
  'Impossible de trouver la ligne de titres (Nom, Prénom, Parent…).': 'تعذّر إيجاد سطر العناوين (اللقب، الاسم، وليّ الأمر…).',
  'Fichier illisible. Vérifiez qu’il s’agit bien d’un fichier .xlsx ou .csv.': 'تعذّرت قراءة الملف. تأكّد أنه ملف ‎.xlsx أو ‎.csv.', '(créez d’abord une classe)': '(أنشئ قسماً أولاً)',
  'Professeur de ces nouvelles classes': 'أستاذ هذه الأقسام الجديدة', 'Prénom': 'الاسم', 'Âge (ou Date de naissance)': 'العمر (أو تاريخ الميلاد)',
};

const tc = (s) => trCore(s.trim());
const RULES = [
  [/^(\d+) \/ 114 validées$/, (m) => `${m[1]} / 114 محفوظة`],
  [/^(\d+) sourates validées sur 114$/, (m) => `${m[1]} سورة محفوظة من 114`],
  [/^(\d+) \/ (\d+) acquis$/, (m) => `${m[1]} / ${m[2]} مكتسبة`],
  [/^depuis (\d+) j$/, (m) => `منذ ${m[1]} يوم`],
  [/^(\d+) ans$/, (m) => `${m[1]} سنة`],
  [/^Voir les (\d+) notes$/, (m) => `عرض الملاحظات (${m[1]})`],
  [/^(\d+) absences sur les 4 derniers cours$/, (m) => `${m[1]} غيابات في آخر 4 حصص`],
  [/^(.+) en cours depuis (\d+) jours$/, (m) => `${tc(m[1])} قيد الحفظ منذ ${m[2]} يوماً`],
  [/^Marquer les (\d+) restant\(s\) présents$/, (m) => `تسجيل الباقين (${m[1]}) حاضرين`],
  [/^(\d+) élève\(s\) pas encore marqué\(s\) : (.+)$/, (m) => `${m[1]} تلميذ لم يُسجَّل بعد : ${m[2]}`],
  [/^Importer (\d+) élève\(s\)$/, (m) => `استيراد ${m[1]} تلميذ`],
  [/^(\d+) élève\(s\) importé\(s\)$/, (m) => `تم استيراد ${m[1]} تلميذ`],
  [/^(\d+) prêt\(s\) à importer$/, (m) => `${m[1]} جاهز للاستيراد`],
  [/^(\d+) incomplet\(s\)$/, (m) => `${m[1]} ناقص`],
  [/^(\d+) déjà présent\(s\)$/, (m) => `${m[1]} موجود مسبقاً`],
  [/^(\d+) ligne\(s\)$/, (m) => `${m[1]} سطر`],
  [/^(\d+) compte\(s\)$/, (m) => `${m[1]} حساب`],
  [/^Classe pour les (\d+) élève\(s\) sans classe$/, (m) => `القسم الخاص بـ ${m[1]} تلميذ بدون قسم`],
  [/^Classes qui seront créées : (.+)$/, (m) => `أقسام سيتم إنشاؤها : ${m[1]}`],
  [/^Colonnes introuvables : (.+)$/, (m) => `أعمدة غير موجودة : ${m[1].split(', ').map(tc).join('، ')}`],
  [/^Manque : (.+)$/, (m) => `ناقص : ${m[1].split(', ').map((x) => ({ nom: 'اللقب', prénom: 'الاسم', parent: 'وليّ الأمر', âge: 'العمر' }[x] || x)).join('، ')}`],
  [/^Ajouter un objectif \(niveau (\d+)\)$/, (m) => `إضافة هدف (المستوى ${m[1]})`],
  [/^Premier objectif du niveau (\d+)$/, (m) => `الهدف الأول للمستوى ${m[1]}`],
  [/^Nouvelle note pour (.+)$/, (m) => `ملاحظة جديدة لـ ${m[1]}`],
  [/^Visibles sur la fiche de chaque élève de (.+)\.$/, (m) => `تظهر في بطاقة كل تلميذ في ${tc(m[1])}.`],
  [/^Transmettez ces identifiants à (.+)\. Le mot de passe ne sera plus affiché ensuite\.$/, (m) => `أرسل هذه المعلومات إلى ${m[1]}. لن تظهر كلمة السر بعد ذلك.`],
  [/^Réinitialiser le mot de passe de (.+?)( \?)?$/, (m) => `إعادة تعيين كلمة السر لـ ${m[1]}${m[2] ? '؟' : ''}`],
  [/^Supprimer le compte de (.+) \?$/, (m) => `حذف حساب ${m[1]}؟`],
  [/^Toutes ses classes, ses élèves et leur suivi seront effacés définitivement\.$/, () => 'ستُحذف كل أقسامه وتلاميذه ومتابعتهم نهائياً.'],
  [/^Valider (.+) \?$/, (m) => `اعتماد سورة ${m[1]}؟`],
  [/^Les (\d+) note\(s\) de cette sourate seront effacées\.$/, (m) => `ستُحذف ملاحظات هذه السورة (${m[1]}).`],
  [/^Remettre (.+) en « non connue » \?$/, (m) => `إرجاع ${m[1]} إلى « لم تُحفظ بعد »؟`],
  [/^Ses (\d+) note\(s\) seront effacées\.$/, (m) => `ستُحذف ملاحظاتها (${m[1]}).`],
  [/^Ses (\d+) élève\(s\) et tout leur suivi seront effacés\.$/, (m) => `سيُحذف تلاميذه (${m[1]}) وكل متابعتهم.`],
  [/^(.+) est inscrit\(e\) !$/, (m) => `تم تسجيل ${m[1]}!`],
  [/^(.+) validée$/, (m) => `تم اعتماد ${m[1]}`],
  [/^Déjà fait aujourd’hui : cours de (.+)$/, (m) => `تم اليوم : حصة ${m[1]}`],
  [/^Ouvrir l’appel du cours de (.+)$/, (m) => `فتح حضور حصة ${m[1]}`],
  [/^Dernier appel : (.+)$/, (m) => `آخر تسجيل حضور : ${m[1].split(' · ').map(tc).join(' · ')}`],
  [/^cours de (\d{2}:\d{2})$/, (m) => `حصة ${m[1]}`],
  [/^(\S+) (\d{2}:\d{2})$/, (m) => (AR[m[1]] ? `${AR[m[1]]} ${m[2]}` : null)],
  [/^(?:Appel du )?[Cc]ours du (.+) à (\d{2})h(\d{2})$/, (m) => `حصة ${m[1]} على الساعة ${m[2]}:${m[3]}`],
  [/^Valider tout le niveau (\d+) pour toute la classe$/, (m) => `اعتماد كل المستوى ${m[1]} لكل القسم`],
  [/^Valider les (\d+) objectifs du niveau (\d+) pour tous les élèves de la classe \?$/, (m) => `اعتماد الأهداف الـ${m[1]} للمستوى ${m[2]} لكل تلاميذ القسم؟`],
  [/^(\d+) \/ (\d+) élèves$/, (m) => `${m[1]} / ${m[2]} تلاميذ`],
  [/^Cours du (.+)$/, (m) => `حصة ${m[1]}`],
  [/^(\d+)(?:er|e) cours$/, (m) => `الحصة ${m[1]}`],
  [/^Modifier l’appel d’aujourd’hui \((.+)\)$/, (m) => `تعديل حضور اليوم (${tc(m[1])})`],
  [/^Appeler le parent de (.+)$/, (m) => `الاتصال بوليّ أمر ${m[1]}`],
  [/^Appeler (.+)$/, (m) => `الاتصال بـ ${m[1]}`],
  [/^« Téléphone » est facultatif\. (.+)$/, (m) => `« الهاتف » اختياري. ${tc(m[1])}`],
  [/^Sourate n° (\d+)$/, (m) => `السورة رقم ${m[1]}`],
  [/^Bonjour (.+)$/, (m) => `مرحباً ${m[1]}`],
  [/^Supprimer (.+) \?$/, (m) => `حذف ${tc(m[1])}؟`],
  [/^Supprimer (.+)$/, (m) => `حذف ${tc(m[1])}`],
  [/^(.+) (\d{2}h\d{2})$/, (m) => (AR[m[1]] ? `${AR[m[1]]} ${m[2].replace('h', ':')}` : null)],
  [/^(\d+) (.+)$/, (m) => (AR[m[2]] ? `${m[1]} ${AR[m[2]]}` : null)],
  [/^(\d+) (.+) \((\d+) j\)$/, () => null],
  [/^(.+) (\d+)$/, (m) => (AR[m[1]] ? `${AR[m[1]]} ${m[2]}` : null)],
];

function trCore(t) {
  if (!t) return t;
  if (AR[t]) return AR[t];
  if (t.startsWith('· ')) return '· ' + trCore(t.slice(2).trim());
  if (t.endsWith(' ·')) return trCore(t.slice(0, -2).trim()) + ' ·';
  if (t.includes('\n\n')) return t.split('\n\n').map((x) => trCore(x.trim())).join('\n\n');
  if (t.includes(' · ')) return t.split(' · ').map((x) => trCore(x.trim())).join(' · ');
  for (const [re, fn] of RULES) { const m = t.match(re); if (m) { const r = fn(m); if (r) return r; } }
  const m = t.match(/^(.+?) : (.+)$/s);
  if (m && AR[m[1]]) return AR[m[1]] + ' : ' + trCore(m[2].trim());
  return t;
}
export function tr(s) {
  if (!isAr || s == null) return s;
  s = String(s);
  const t = s.trim();
  if (!t) return s;
  const r = trCore(t);
  return r === t ? s : s.replace(t, r);
}

const ATTRS = ['placeholder', 'aria-label', 'title'];
export function translateDom(root) {
  if (!isAr || !root) return;
  if (root.nodeType === 3) { const v = tr(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
  if (root.nodeType !== 1) return;
  if (root.closest && root.closest('[data-notr]')) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && n.parentElement.closest('[data-notr],script,style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  const nodes = [];
  let n;
  while ((n = w.nextNode())) nodes.push(n);
  for (const x of nodes) { const v = tr(x.nodeValue); if (v !== x.nodeValue) x.nodeValue = v; }
  const els = [root, ...root.querySelectorAll('[placeholder],[aria-label],[title]')];
  for (const e of els) for (const a of ATTRS) { if (e.hasAttribute && e.hasAttribute(a)) { const v = e.getAttribute(a); const t = tr(v); if (t !== v) e.setAttribute(a, t); } }
}
export function startAutoTranslate() {
  document.documentElement.lang = lang;
  document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  if (!isAr) return;
  translateDom(document.body);
  new MutationObserver((muts) => { for (const m of muts) for (const nd of m.addedNodes) translateDom(nd); }).observe(document.body, { childList: true, subtree: true });
}
