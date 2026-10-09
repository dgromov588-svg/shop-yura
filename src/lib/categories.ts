/**
 * Перелік «КУПУЄМО» — точно за рекламною листівкою салону «АнтикварЪ».
 * Використовується на сайті (секція WeBuy), у формі заявки та в адмін-панелі.
 */

export type BuyCategoryId =
  | 'books'
  | 'postcards'
  | 'military'
  | 'desk'
  | 'toys'
  | 'models'
  | 'drinks'
  | 'perfume'
  | 'cameras'

export interface BuyCategory {
  id: BuyCategoryId
  title: string
  details?: string
  img: string
}

export const BUY_CATEGORIES: BuyCategory[] = [
  {
    id: 'books',
    title: 'Книги',
    details: 'дореволюційні видання енциклопедичної та історичної тематики',
    img: './category-books.jpg',
  },
  {
    id: 'postcards',
    title: 'Листівки та фотокартки',
    details: 'царського періоду',
    img: './cat-postcards.jpg',
  },
  {
    id: 'military',
    title: 'Стара військова форма',
    details: 'головні убори, кокарди',
    img: './cat-military.jpg',
  },
  {
    id: 'desk',
    title: 'Письмові прибори',
    details: 'настільні лампи, свічники',
    img: 'https://images.pexels.com/photos/7063745/pexels-photo-7063745.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800',
  },
  {
    id: 'toys',
    title: 'Ялинкові іграшки, гірлянди',
    details: 'середини XX ст.',
    img: 'https://images.pexels.com/photos/37010550/pexels-photo-37010550.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800',
  },
  {
    id: 'models',
    title: 'Масштабні моделі',
    details: 'автомобілі, бронетехніка, спецтехніка',
    img: 'https://images.pexels.com/photos/15255716/pexels-photo-15255716.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800',
  },
  {
    id: 'drinks',
    title: 'Колекційні напої',
    img: 'https://images.pexels.com/photos/6138585/pexels-photo-6138585.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800',
  },
  {
    id: 'perfume',
    title: 'Старі парфуми',
    img: 'https://images.pexels.com/photos/7598170/pexels-photo-7598170.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800',
  },
  {
    id: 'cameras',
    title: 'Фотоапарати, обʼєктиви, біноклі',
    img: 'https://images.pexels.com/photos/1846418/pexels-photo-1846418.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800',
  },
]
