// Utility functions for member profile pictures and avatar generation

export interface PresetAvatar {
  id: string;
  name: string;
  url: string;
}

// Collection of clean, diverse, SVG avatars for organization members
export const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: 'male-1',
    name: 'করিম',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Karim&backgroundColor=c0aede,b6e3f4,ffd5dc',
  },
  {
    id: 'male-2',
    name: 'রফিক',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Rafiq&backgroundColor=d1d4f9,ffd5dc,ffdfbf',
  },
  {
    id: 'male-3',
    name: 'তানভীর',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Tanvir&backgroundColor=b6e3f4,c0aede,d1d4f9',
  },
  {
    id: 'male-4',
    name: 'শফিক',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Shafiq&backgroundColor=ffdfbf,ffd5dc,c0aede',
  },
  {
    id: 'male-5',
    name: 'মেহেদী',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Mehedi&backgroundColor=ffd5dc,b6e3f4,d1d4f9',
  },
  {
    id: 'male-6',
    name: 'আল-আমিন',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Alamin&backgroundColor=b6e3f4,ffdfbf,c0aede',
  },
  {
    id: 'male-7',
    name: 'জাহিদ',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Jahid&backgroundColor=c0aede,ffd5dc,b6e3f4',
  },
  {
    id: 'male-8',
    name: 'আশরাফুল',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Ashraful&backgroundColor=d1d4f9,b6e3f4,ffdfbf',
  },
  {
    id: 'female-1',
    name: 'ফাতেমা',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Fatema&backgroundColor=ffd5dc,ffdfbf,c0aede',
  },
  {
    id: 'female-2',
    name: 'রোকেয়া',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Rokeya&backgroundColor=b6e3f4,ffd5dc,d1d4f9',
  },
  {
    id: 'female-3',
    name: 'সালমা',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Salma&backgroundColor=ffdfbf,c0aede,b6e3f4',
  },
  {
    id: 'female-4',
    name: 'নাসরিন',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Nasrin&backgroundColor=c0aede,d1d4f9,ffd5dc',
  },
];

/**
 * Generate a random avatar URL from seeds or timestamps
 */
export function generateRandomAvatar(seed?: string): string {
  const randomSeed = seed || `member-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const styles = ['notionists', 'lorelei', 'adventurer'];
  const chosenStyle = styles[Math.floor(Math.random() * styles.length)];
  return `https://api.dicebear.com/7.x/${chosenStyle}/svg?seed=${encodeURIComponent(
    randomSeed
  )}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

/**
 * Compress and crop an uploaded image file into a square base64 data URL
 * so it can be saved in localStorage without exceeding storage limits.
 */
export function compressAndResizeImage(file: File, maxSize = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('অনুগ্রহ করে শুধুমাত্র ছবি ফাইল (JPG, PNG) নির্বাচন করুন'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Square center-crop coordinates
          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          canvas.width = maxSize;
          canvas.height = maxSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          // Render centered cropped image
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, maxSize, maxSize);

          // Export as compressed WebP or JPEG
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } catch (err) {
          // Fallback to original reader result
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => {
        reject(new Error('ছবি লোড করা যায়নি'));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('ফাইল পড়তে সমস্যা হয়েছে'));
    };
    reader.readAsDataURL(file);
  });
}
