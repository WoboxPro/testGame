/**
 * 🗺️ Region - Тип региона (зона/биом)
 *
 * Определяет свойства региона без привязки к координатам.
 * Сетево-ориентированный подход - только данные.
 */

export class Region {
  constructor(options = {}) {
    // Идентификация
    this.id = options.id || `region_type_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.name = options.name || 'region';
    this.displayName = options.displayName || this.name;

    // 🎨 Визуальные свойства
    this.groundTexture = {
      textureUrl: options.groundTexture?.textureUrl || null,
      scaleMode: options.groundTexture?.scaleMode || 'tile', // tile | stretch | center
      tint: options.groundTexture?.tint || null
    };

    // 🔲 Визуальные границы региона
    this.borders = {
      enabled: options.borders?.enabled || false,
      color: options.borders?.color || '#00FFFF', // Голубой по умолчанию
      width: options.borders?.width || 3,
      alpha: options.borders?.alpha || 1.0
    };
  }

  /**
   * 📊 Получить информацию о типе региона
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      groundTexture: this.groundTexture,
      borders: this.borders
    };
  }
}
