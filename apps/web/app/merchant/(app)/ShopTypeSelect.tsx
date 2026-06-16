// Shared shop-type picker (same option set as signup). The chosen type sets the place's
// category/subcategory + whether it sells products / offers stay (SHOP_TYPES in ../actions).
export function ShopTypeSelect({ defaultValue = 'cafe' }: { defaultValue?: string }) {
  return (
    <select name="shop_type" defaultValue={defaultValue}>
      <optgroup label="ร้านอาหาร / เครื่องดื่ม (มีเมนู/สินค้า)">
        <option value="cafe">คาเฟ่</option><option value="restaurant">ร้านอาหาร</option>
        <option value="street_food">สตรีทฟู้ด</option><option value="dessert">ของหวาน / เบเกอรี</option>
      </optgroup>
      <optgroup label="ร้านขายของ (มีสินค้า)">
        <option value="market">ร้านขายของ / ผลไม้ผัก</option><option value="shop">ร้านค้าอื่นๆ</option>
      </optgroup>
      <optgroup label="ที่พัก (มีห้องเช่ารายเดือน/รายวัน)">
        <option value="dorm">หอพัก</option><option value="apartment">อพาร์ตเมนต์</option>
        <option value="condo">คอนโด</option><option value="mansion">แมนชั่น</option>
        <option value="house">บ้านเช่า</option><option value="homestay">โฮมสเตย์</option>
        <option value="guesthouse">เกสต์เฮาส์</option><option value="hotel">โรงแรม</option>
      </optgroup>
      <optgroup label="อื่นๆ">
        <option value="general">ร้านค้า / บริการทั่วไป (ไม่มีสินค้า/ห้องพัก)</option>
      </optgroup>
    </select>
  );
}
